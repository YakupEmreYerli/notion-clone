import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { test, type Browser } from "@playwright/test";

import {
  deviceScaleFactor,
  shots,
  viewport,
  type Locale,
  type Shot,
} from "./shots";

const OUTPUT_DIR = path.join(process.cwd(), "docs", "screenshots");
const MANIFEST = path.join(OUTPUT_DIR, "manifest.json");
const SEED_DIR = path.join(process.cwd(), ".screenshots");
const THEME_STORAGE_KEY = "zotion-theme-2";
const READY_TIMEOUT = 20_000;
const SETTLE_MS = 700;
// 3840x2160 PNGs would be ~15 MB across the gallery. WebP at this quality is
// visually indistinguishable on a UI screenshot and roughly a fifth the size.
const WEBP = { quality: 85, effort: 6 } as const;

type Outcome = "written" | "unchanged" | "skipped";

/** What `scripts/seed-demo.mjs` leaves behind for one locale. */
type Seed = {
  workspace: Record<string, string>;
  storageState: Parameters<Browser["newContext"]>[0] extends infer O
    ? O extends { storageState?: infer S }
      ? S
      : never
    : never;
};

const loadSeed = async (locale: Locale): Promise<Seed | null> => {
  try {
    return JSON.parse(await readFile(path.join(SEED_DIR, `${locale}.json`), "utf8"));
  } catch {
    return null;
  }
};

const digest = (buffer: Buffer) =>
  createHash("sha256").update(buffer).digest("hex");

/** Keeps a re-capture that is byte-identical from producing a git diff. */
const writeIfChanged = async (file: string, next: Buffer) => {
  try {
    if (digest(await readFile(file)) === digest(next)) return false;
  } catch {
    // No previous file — fall through and write it.
  }
  await writeFile(file, next);
  return true;
};

const resolvePath = (template: string, workspace: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = workspace[key];
    if (!value) throw new Error(`Seeded workspace has no "${key}"`);
    return value;
  });

const capture = async (
  browser: Browser,
  shot: Shot,
  seed: Seed | null,
): Promise<Outcome> => {
  if (!seed) return "skipped";

  const context = await browser.newContext({
    // Auth ekranları oturumluyu /documents'a atar — onları yalnızca
    // oturumsuz bir bağlamda yakalayabiliriz.
    storageState: shot.signedOut ? undefined : seed.storageState,
    colorScheme: shot.theme,
    reducedMotion: "reduce",
    viewport,
    deviceScaleFactor,
  });

  try {
    const page = await context.newPage();
    await page.addInitScript(
      ([key, theme]) => {
        try {
          window.localStorage.setItem(key, theme);
        } catch {
          // Storage disabled — the context colorScheme still applies.
        }
      },
      [THEME_STORAGE_KEY, shot.theme] as const,
    );
    await page.goto(resolvePath(shot.path, seed.workspace));

    try {
      await page
        .locator(shot.waitFor)
        .first()
        .waitFor({ state: "visible", timeout: READY_TIMEOUT });
    } catch {
      return "skipped";
    }

    await page.evaluate(() => document.fonts.ready);
    // Covers stream in over the network — wait them out so a half-painted
    // image never lands in the gallery.
    await page.waitForLoadState("load");
    await page.waitForTimeout(SETTLE_MS);

    const png = await page.screenshot({ fullPage: shot.fullPage ?? false });
    const buffer = await sharp(png).webp(WEBP).toBuffer();
    const file = path.join(OUTPUT_DIR, `${shot.file}.webp`);
    return (await writeIfChanged(file, buffer)) ? "written" : "unchanged";
  } finally {
    await context.close();
  }
};

test.describe.configure({ mode: "serial" });

/**
 * Galeri tek bir demo hesabına iki dili SIRAYLA seed'lediği için çekim de iki
 * geçişte yapılır: `GALLERY_LOCALE` o geçişte hangi çekimlerin alınacağını
 * seçer. Bayrak yoksa (elle koşum) hepsi denenir.
 */
const galleryLocale = process.env.GALLERY_LOCALE as Locale | undefined;
const activeShots = galleryLocale
  ? shots.filter((shot) => shot.workspace === galleryLocale)
  : shots;

test.describe("README screenshots", () => {
  const results = new Map<string, Outcome>();
  const seeds = new Map<Locale, Seed | null>();

  test.beforeAll(async () => {
    await mkdir(OUTPUT_DIR, { recursive: true });
    for (const locale of galleryLocale ? [galleryLocale] : (["en", "tr"] as const)) {
      seeds.set(locale, await loadSeed(locale));
    }
    if ([...seeds.values()].some((seed) => !seed)) {
      console.warn(
        "! .screenshots/<locale>.json missing — run `npm run seed:demo` with the stack up. Committed PNGs will be kept.",
      );
    }
  });

  for (const shot of activeShots) {
    test(shot.file, async ({ browser }) => {
      const outcome = await capture(browser, shot, seeds.get(shot.workspace) ?? null);
      results.set(shot.file, outcome);
      if (outcome === "skipped") {
        console.warn(`! ${shot.file} skipped — kept the committed PNG.`);
      }
    });
  }

  test.afterAll(async () => {
    // İki geçiş var: bu geçişin sonuçları öncekinin üzerine yazılmamalı, bu
    // yüzden mevcut manifest'ten okunup birleştirilir.
    const previous = await readFile(MANIFEST, "utf8")
      .then((raw) => JSON.parse(raw) as { shots?: { file: string; status: string }[] })
      .catch(() => null);
    const previousStatus = new Map(
      (previous?.shots ?? []).map((shot) => [shot.file, shot.status]),
    );

    const manifest = {
      generatedAt: new Date().toISOString().slice(0, 10),
      viewport,
      deviceScaleFactor,
      shots: shots.map((shot) => ({
        ...shot,
        status:
          results.get(shot.file) ?? previousStatus.get(shot.file) ?? "not-run",
      })),
    };
    await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  });
});
