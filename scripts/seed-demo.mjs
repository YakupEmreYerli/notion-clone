#!/usr/bin/env node
/**
 * README ekran görüntülerinin çekildiği demo çalışma alanını hazırlar.
 *
 *   node scripts/seed-demo.mjs --register        # hesabı aç (yalnızca bir kez)
 *   node scripts/seed-demo.mjs --locale en|tr    # o dilin içeriğini kur
 *
 * **Tek hesap** kullanır. Zotion tek sahip modelinde olduğu için ikinci bir
 * demo hesabı açmak üretim kuralını delmek demekti; bunun yerine iki dil aynı
 * hesaba sırayla seed'lenir (`seed:demoWorkspace` zaten o kullanıcının
 * dokümanlarını silip yeniden kurar) ve her dil kendi çekiminden hemen önce
 * hazırlanır.
 *
 * Bu yüzden script yalnızca `scripts/gallery/run.mjs`'in kaldırdığı **tek
 * kullanımlık boş yığında** anlamlıdır: orada demo hesabı gerçekten ilk
 * kullanıcıdır ve seed kimsenin verisini silemez.
 *
 * Yığın ayakta değilse 0 ile çıkar ve uyarır — çekim adımı o zaman commit
 * edilmiş PNG'leri korur.
 *
 * Aşağıdaki kimlik bilgileri yerel fixture'dır, sır değildir.
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const run = promisify(execFile);

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const PASSWORD = process.env.DEMO_PASSWORD ?? "zotion-gallery-demo";
const EMAIL = process.env.DEMO_EMAIL ?? "demo@zotion.local";
const NAME = process.env.DEMO_NAME ?? "Demo";
const OUT_DIR = path.join(process.cwd(), ".screenshots");

const args = process.argv.slice(2);
const REGISTER_ONLY = args.includes("--register");
const LOCALE = args[args.indexOf("--locale") + 1];

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
      auth.response.status === 403
        ? `registration is closed on ${APP_URL} and ${email} does not exist. ` +
            "The gallery must run against the disposable stack " +
            "(`npm run screenshots`), where the demo account is the first user."
        : `Better Auth rejected ${email} (${auth.response.status}). ` +
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

const { userId, cookie } = await signIn(EMAIL, NAME);

if (REGISTER_ONLY) {
  console.log(`✓ demo account ready: ${EMAIL}`);
} else {
  if (LOCALE !== "en" && LOCALE !== "tr") {
    console.error("usage: seed-demo.mjs --register | --locale en|tr");
    process.exit(1);
  }
  // Aynı hesaba sırayla iki dil kurulur; seed mutation'ı önce bu kullanıcının
  // dokümanlarını temizlediği için diller birbirine karışmaz.
  const workspace = await seed(userId, LOCALE);
  await writeFile(
    path.join(OUT_DIR, `${LOCALE}.json`),
    `${JSON.stringify({ email: EMAIL, workspace, storageState: storageState(cookie) }, null, 2)}\n`,
  );
  console.log(`✓ ${LOCALE}: ${workspace.rows} books seeded as ${EMAIL}`);
}
