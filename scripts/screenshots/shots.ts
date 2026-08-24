/**
 * The single source of both README galleries. Adding a view here produces the
 * PNGs and the README sections — never edit the generated blocks by hand.
 *
 * Every shot is a full 1920x1080 frame of the real app signed in as a demo
 * account — the same aspect ratio as an ordinary desktop screen, so a README
 * shows a scaled-down copy of the real layout rather than a narrower one that
 * reflows differently. No cropped-out chrome, no component fixtures.
 *
 * Shots exist per locale: the `en` workspace feeds README.md and the `tr`
 * workspace feeds README.tr.md, so each README shows content in its own
 * language. Views marked `shared` carry no user content and are captured once.
 */
export type Locale = "en" | "tr";

/** "shared" = the same PNG appears in both READMEs. */
export type ShotLocale = Locale | "shared";

type View = {
  /** Stable key; also the PNG file-name stem. */
  group: string;
  title: string;
  caption: string;
  /** Heading + caption used by README.tr.md. */
  titleTr: string;
  captionTr: string;
  /**
   * Path on the dev server. `{token}` placeholders are filled in from the
   * seeded ids in `.screenshots/<locale>.json`.
   */
  path: string;
  /** Selector that must be visible before the shot is taken, per locale. */
  waitFor: Record<Locale, string>;
  /** Capture the whole scrollable page instead of just the viewport. */
  fullPage?: boolean;
  /** No user content — captured once and shown in both READMEs. */
  shared?: boolean;
};

export type Shot = Omit<View, "waitFor" | "shared"> & {
  /** File name under docs/screenshots, without the extension. */
  file: string;
  theme: "light" | "dark";
  locale: ShotLocale;
  /** Which seeded workspace to sign in as; "shared" uses the English one. */
  workspace: Locale;
  waitFor: string;
};

export const viewport = { width: 1920, height: 1080 };

/**
 * Layout is computed at `viewport` — the frame an ordinary desktop screen shows
 * — but rasterised at 2x, so the image stays sharp after a README scales it
 * down to its content width.
 */
export const deviceScaleFactor = 2;

const VIEWS: View[] = [
  {
    group: "landing",
    title: "Landing page",
    caption: "What a signed-out visitor lands on.",
    titleTr: "Karşılama sayfası",
    captionTr: "Giriş yapmamış bir ziyaretçinin gördüğü sayfa.",
    path: "/",
    waitFor: { en: "text=Welcome to", tr: "text=Welcome to" },
    fullPage: true,
    shared: true,
  },
  {
    group: "workspace",
    title: "Pages and the editor",
    caption:
      "A nested page with a cover, an icon and real notes — sidebar, breadcrumb and editor as they actually render.",
    titleTr: "Sayfalar ve editör",
    captionTr:
      "Kapağı, ikonu ve gerçek notları olan iç içe bir sayfa — sidebar, breadcrumb ve editör göründükleri hâliyle.",
    path: "/documents/{notesPageId}",
    waitFor: {
      en: "text=Why I keep coming back to it",
      tr: "text=Neden hep geri dönüyorum",
    },
  },
  {
    group: "database-table",
    title: "Databases — table view",
    caption:
      "A book tracker: title, author, a select and a multi-select over nine books.",
    titleTr: "Veritabanları — tablo görünümü",
    captionTr:
      "Kitap takibi: dokuz kitap üzerinde başlık, yazar, select ve multi-select.",
    path: "/documents/{bookTrackerId}?v={tableViewId}",
    waitFor: {
      en: '[data-testid="database-column-header"]',
      tr: '[data-testid="database-column-header"]',
    },
  },
  {
    group: "database-board",
    title: "Databases — board view",
    caption:
      "The same rows grouped by the status property, saved as a second view.",
    titleTr: "Veritabanları — board görünümü",
    captionTr:
      "Aynı satırların durum property'sine göre gruplanmış hâli; ikinci bir kayıtlı görünüm.",
    path: "/documents/{bookTrackerId}?v={boardViewId}",
    waitFor: { en: "text=Want to read", tr: "text=Okunacak" },
  },
];

const THEMES = ["light", "dark"] as const;
const LOCALES: Locale[] = ["en", "tr"];

export const shots: Shot[] = VIEWS.flatMap((view) => {
  const { waitFor, shared, ...rest } = view;
  const locales: Locale[] = shared ? ["en"] : LOCALES;

  return locales.flatMap((locale) =>
    THEMES.map((theme) => ({
      ...rest,
      file: shared
        ? `${view.group}-${theme}`
        : `${view.group}-${locale}-${theme}`,
      theme,
      locale: shared ? ("shared" as const) : locale,
      workspace: locale,
      waitFor: waitFor[locale],
    })),
  );
});
