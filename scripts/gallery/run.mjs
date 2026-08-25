#!/usr/bin/env node
/**
 * README galerisini **tek kullanımlık, boş bir Zotion yığınında** üretir.
 *
 *   npm run screenshots
 *
 * Neden: galeri iki dilde doküman seti istiyor, Zotion ise tek sahip modelinde
 * — ilk hesaptan sonra kayıt kapalı. Eskiden bu, üretim kuralını env ile delen
 * bir bayrakla çözülüyordu. Burada kural hiç delinmiyor: yığın boş kalktığı
 * için demo hesabı gerçekten **ilk kullanıcıdır**, normal kayıt akışıyla açılır.
 * Bir yan fayda: seed artık operatörün kendi dokümanlarına asla dokunamaz,
 * ve galeri her makinede aynı şekilde üretilebilir.
 *
 * Akış: yığını kaldır → Convex fonksiyonlarını it → uygulamayı başlat →
 * demo hesabını aç → `en` seed + çekim → `tr` seed + çekim → README'leri yaz →
 * yığını volume'larıyla sil.
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { APP_URL, DEMO, PORTS, PROJECT, appEnv, composeEnv } from "./env.mjs";

const COMPOSE = [
  "compose",
  "-p",
  PROJECT,
  "-f",
  "docker-compose.yml",
  "-f",
  "docker/gallery/compose.yml",
];

const APP_LOG = path.join(process.cwd(), ".screenshots", "app.log");

const step = (message) => console.log(`\n▸ ${message}`);

const run = (command, args, { env = process.env, capture = false } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let out = "";
    let err = "";
    child.stdout?.on("data", (chunk) => (out += chunk));
    child.stderr?.on("data", (chunk) => (err += chunk));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(out)
        : reject(
            new Error(
              `${command} ${args.join(" ")} exited with ${code}${err ? `\n${err}` : ""}`,
            ),
          ),
    );
  });

const docker = (args, options) => run("docker", [...COMPOSE, ...args], options);

const waitFor = async (label, check, { timeoutMs = 180_000 } = {}) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await check().catch(() => false)) return;
    if (Date.now() > deadline) {
      throw new Error(`${label} did not become ready — last probe: ${lastProbe}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

/** Son başarısız probe'un sebebi — hata mesajına iliştirilir. */
let lastProbe = "no attempt";

const httpOk = async (url) => {
  const response = await fetch(url).catch((error) => {
    lastProbe = `${url} -> ${error.message}`;
    return null;
  });
  if (!response) return false;
  if (response.status >= 500) {
    const body = await response.text().catch(() => "");
    lastProbe = `${url} -> HTTP ${response.status}\n${body.slice(0, 800)}`;
    return false;
  }
  return true;
};

let appProcess = null;

const teardown = async () => {
  if (appProcess && !appProcess.killed) appProcess.kill("SIGTERM");
  step("yığın siliniyor (volume'lar dahil)");
  // `down -v`: bu proje kendi volume'larını kullandığı için geliştirme
  // yığınının verisine dokunmaz.
  await docker(["down", "-v", "--remove-orphans"], { env: composeEnv() }).catch(
    (error) => console.warn(`! teardown failed: ${error.message}`),
  );
};

const main = async () => {
  const env = composeEnv();

  step("tek kullanımlık yığın kaldırılıyor");
  await docker(
    ["up", "-d", "postgres", "minio", "minio-init", "convex-backend"],
    { env },
  );

  step("Convex backend bekleniyor");
  await waitFor("convex-backend", () =>
    httpOk(`http://localhost:${PORTS.convexCloud}/version`),
  );

  step("admin key üretiliyor");
  const keyOutput = await docker(
    ["exec", "-T", "convex-backend", "./generate_admin_key.sh"],
    { env, capture: true },
  );
  const adminKey = keyOutput.trim().split(/\s+/).pop();
  if (!adminKey) throw new Error("generate_admin_key.sh returned no key");

  step("Convex fonksiyonları itiliyor");
  // `convex/auth.config.js` issuer'ı push anında **deployment** ortamından
  // okur — süreç ortamı yetmez (bkz. docker/convex-deploy.sh).
  await run("npx", ["convex", "env", "set", "CONVEX_AUTH_ISSUER", APP_URL], {
    env: appEnv(adminKey),
  });
  await run("npx", ["convex", "deploy", "-y"], { env: appEnv(adminKey) });

  step("uygulama derleniyor (ayrı dist dizini)");
  // Dev sunucusu yerine production sunucusu: Next 16 aynı dizinde ikinci bir
  // dev sunucusuna izin vermiyor, ayrıca galeri gerçek üretim çıktısını
  // göstermeli. Runtime env okunduğu için build'e URL gömülmüyor.
  await run("npx", ["next", "build"], {
    env: { ...appEnv(adminKey), NODE_ENV: "production" },
  });

  step(`uygulama başlatılıyor (${APP_URL})`);
  // Log dosyaya yazılır: kalkmazsa sebebini görebilmek için.
  await mkdir(path.dirname(APP_LOG), { recursive: true });
  const appLog = createWriteStream(APP_LOG);
  appProcess = spawn(
    "npx",
    ["next", "start", "-p", String(PORTS.app), "-H", "0.0.0.0"],
    {
      env: { ...appEnv(adminKey), NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  appProcess.stdout.pipe(appLog);
  appProcess.stderr.pipe(appLog);
  await waitFor("app", () => httpOk(`${APP_URL}/login`)).catch(async (error) => {
    const log = await readFile(APP_LOG, "utf8").catch(() => "");
    throw new Error(`${error.message}\n--- next start ---\n${log.slice(-2000)}`);
  });

  step("demo hesabı açılıyor — bu yığındaki ilk ve tek kullanıcı");
  await run("node", ["scripts/seed-demo.mjs", "--register"], {
    env: { ...appEnv(adminKey), APP_URL, DEMO_EMAIL: DEMO.email },
  });

  for (const locale of ["en", "tr"]) {
    step(`${locale}: içerik seed'leniyor`);
    await run("node", ["scripts/seed-demo.mjs", "--locale", locale], {
      env: { ...appEnv(adminKey), APP_URL, DEMO_EMAIL: DEMO.email },
    });

    step(`${locale}: çekimler alınıyor`);
    await run(
      "npx",
      ["playwright", "test", "--config=playwright.screenshots.config.ts"],
      {
        env: {
          ...appEnv(adminKey),
          GALLERY_LOCALE: locale,
          PLAYWRIGHT_BASE_URL: APP_URL,
        },
      },
    );
  }

  step("README galerileri yazılıyor");
  await run("node", ["scripts/update-readme-gallery.mjs"]);
};

// Ctrl+C ya da SIGTERM: yığın ortada kalmasın. (Pre-commit hook'u zaman
// aşımına uğratıp süreci öldürdüğünde tam olarak bu oluyordu.)
let tearingDown = false;
const teardownOnce = async () => {
  if (tearingDown) return;
  tearingDown = true;
  await teardown();
};
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, async () => {
    await teardownOnce();
    process.exit(130);
  });
}

main()
  .then(teardownOnce)
  .catch(async (error) => {
    console.error(`\n✗ ${error.message}`);
    await teardownOnce();
    process.exitCode = 1;
  });
