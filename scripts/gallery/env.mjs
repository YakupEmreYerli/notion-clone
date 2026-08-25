/**
 * Tek kullanımlık galeri yığınının ortamı.
 *
 * Buradaki parolalar/secret'lar **gerçek sır değildir**: yığın her koşuda
 * sıfırdan kurulup sonunda volume'larıyla birlikte siliniyor, sadece bu
 * makinede ve sadece koşu süresince yaşıyor. Sabit tutulmaları koşuyu
 * tekrarlanabilir kılıyor.
 */

/**
 * Docker'ın varsayılan köprü arayüzü (`docker0`). Tek adresle iki yönü de
 * çözer: konteynerin içinden "host makinesi", host'un üzerinde ise gerçek bir
 * yerel arayüz. Böylece APP_URL ve NEXT_PUBLIC_CONVEX_URL hem tarayıcıdan hem
 * Convex backend'inin JWKS çekişinden aynı origin olarak görünür — tek JWT
 * audience, tek çerez alanı.
 */
export const HOST = process.env.GALLERY_HOST ?? "172.17.0.1";

export const PORTS = {
  app: 3100,
  convexCloud: 3310,
  convexSite: 3311,
  postgres: 55433,
  minio: 9010,
};

export const PROJECT = "zotion-gallery";

export const APP_URL = `http://${HOST}:${PORTS.app}`;
export const CONVEX_URL = `http://${HOST}:${PORTS.convexCloud}`;
export const CONVEX_SITE_URL = `http://${HOST}:${PORTS.convexSite}`;

/** Demo hesabı: bu yığında **ilk ve tek** kullanıcı — kayıt kuralı delinmiyor. */
export const DEMO = {
  email: "demo@zotion.local",
  name: "Demo",
  password: "zotion-gallery-demo",
};

/** `docker compose` için ortam (compose değişken enterpolasyonu okur). */
export const composeEnv = () => ({
  ...process.env,
  COMPOSE_PROJECT_NAME: PROJECT,
  POSTGRES_USER: "zotion",
  POSTGRES_PASSWORD: "zotion-gallery",
  POSTGRES_DB: "postgres",
  AUTH_DATABASE_NAME: "zotion_auth",
  CONVEX_INSTANCE_NAME: "zotion",
  CONVEX_INSTANCE_SECRET:
    "0000000000000000000000000000000000000000000000000000000000000001",
  NEXT_PUBLIC_CONVEX_URL: CONVEX_URL,
  CONVEX_SITE_URL,
  APP_URL,
  BETTER_AUTH_SECRET: "zotion-gallery-better-auth-secret",
  S3_ACCESS_KEY_ID: "zotion-gallery",
  S3_SECRET_ACCESS_KEY: "zotion-gallery-secret",
  S3_BUCKET: "zotion",
});

/** Host'ta çalışan `next dev` için ortam. */
export const appEnv = (adminKey) => ({
  ...composeEnv(),
  PORT: String(PORTS.app),
  AUTH_DATABASE_URL: `postgresql://zotion:zotion-gallery@localhost:${PORTS.postgres}/zotion_auth`,
  AUTH_AUTO_MIGRATE: "true",
  S3_ENDPOINT: `http://localhost:${PORTS.minio}`,
  S3_FORCE_PATH_STYLE: "true",
  CONVEX_SELF_HOSTED_URL: `http://localhost:${PORTS.convexCloud}`,
  CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey ?? "",
  // Galeri build'i ayrı dizine: çalışan `next dev` etkilenmesin.
  NEXT_DIST_DIR: ".next-gallery",
});
