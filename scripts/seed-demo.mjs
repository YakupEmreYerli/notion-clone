#!/usr/bin/env node
/**
 * Prepares the demo workspaces the README screenshots are taken from — one per
 * README language, each in its own account so the two never mix:
 *
 *   en -> README.md      (English pages, English book tracker)
 *   tr -> README.tr.md   (Türkçe sayfalar, Türkçe kitap takibi)
 *
 * For each locale it signs the demo account up (or in) through Better Auth,
 * runs `seed:demoWorkspace`, and writes the session cookie plus the seeded
 * document ids to `.screenshots/<locale>.json` (gitignored) for Playwright.
 *
 * The whole stack has to be running (`docker compose up -d postgres minio
 * minio-init convex-backend` plus `npm run dev`). If it is not, this exits 0
 * with a warning — the capture step then skips those shots and keeps the
 * committed PNGs rather than blocking a commit.
 *
 * The credentials below are local-only fixtures for a self-hosted dev
 * instance, not secrets; override them with DEMO_PASSWORD / DEMO_EMAIL_PREFIX.
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const run = promisify(execFile);

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const PASSWORD = process.env.DEMO_PASSWORD ?? "zotion-demo-password";
const PREFIX = process.env.DEMO_EMAIL_PREFIX ?? "demo";
const OUT_DIR = path.join(process.cwd(), ".screenshots");

const LOCALES = [
  { locale: "en", name: "Demo" },
  { locale: "tr", name: "Demo" },
];

const warnAndExit = (message) => {
  console.warn(`! demo workspaces not seeded — ${message}`);
  console.warn("  Screenshots needing the app will be skipped.");
  process.exit(0);
};

const post = async (route, body) => {
  const response = await fetch(`${APP_URL}/api/auth/${route}`, {
    method: "POST",
    // Better Auth rejects an origin-less POST with MISSING_OR_NULL_ORIGIN,
    // so this states the origin the app itself is served from.
    headers: { "content-type": "application/json", origin: APP_URL },
    body: JSON.stringify(body),
  });
  return { response, payload: await response.json().catch(() => null) };
};

const signIn = async (email, name) => {
  let auth = await post("sign-up/email", { name, email, password: PASSWORD }).catch(
    (error) => warnAndExit(`${APP_URL} unreachable (${error.message})`),
  );

  // Already registered from an earlier run — sign in instead.
  if (!auth.response.ok) {
    auth = await post("sign-in/email", { email, password: PASSWORD });
  }
  if (!auth.response.ok) {
    warnAndExit(
      `Better Auth rejected ${email} (${auth.response.status}). ` +
        "If the password was changed, delete the demo user or set DEMO_PASSWORD.",
    );
  }

  const userId = auth.payload?.user?.id;
  const cookie = (auth.response.headers.getSetCookie?.() ?? [])
    .map((entry) => entry.split(";")[0])
    .find((entry) => entry.includes("session_token"));

  if (!userId || !cookie) {
    warnAndExit(`the sign-in response for ${email} carried no user id or cookie`);
  }
  return { userId, cookie };
};

const seed = async (userId, locale) => {
  const result = await run(
    "npx",
    [
      "convex",
      "run",
      "seed:demoWorkspace",
      JSON.stringify({ userId, locale }),
    ],
    { cwd: process.cwd(), maxBuffer: 1024 * 1024 },
  ).catch((error) =>
    warnAndExit(`\`convex run seed:demoWorkspace\` failed — ${error.message}`),
  );

  // `convex run` prints the return value as JSON after its own log lines.
  const jsonStart = result.stdout.indexOf("{");
  if (jsonStart === -1) warnAndExit("the seed mutation returned no document ids");
  return JSON.parse(result.stdout.slice(jsonStart));
};

const storageState = (cookie) => {
  const [name, value] = cookie.split("=");
  const { hostname } = new URL(APP_URL);
  return {
    cookies: [
      {
        name,
        value,
        domain: hostname,
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: APP_URL.startsWith("https"),
        sameSite: "Lax",
      },
    ],
    origins: [],
  };
};

await mkdir(OUT_DIR, { recursive: true });

for (const { locale, name } of LOCALES) {
  const email = `${PREFIX}-${locale}@zotion.local`;
  const { userId, cookie } = await signIn(email, name);
  const workspace = await seed(userId, locale);

  await writeFile(
    path.join(OUT_DIR, `${locale}.json`),
    `${JSON.stringify({ email, workspace, storageState: storageState(cookie) }, null, 2)}\n`,
  );
  console.log(`✓ ${locale}: ${workspace.rows} books seeded as ${email}`);
}
