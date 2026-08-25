import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins/jwt";
import { Pool } from "pg";

import { getAppUrl, JWT_AUDIENCE } from "./env";

const appUrl = getAppUrl();

const connectionString =
  process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString && process.env.NEXT_PHASE !== "phase-production-build") {
  console.error(
    "[auth] AUTH_DATABASE_URL (or DATABASE_URL) is not set. Better Auth needs a Postgres connection string.",
  );
}

const globalForPool = globalThis as unknown as { authPool?: Pool };

export const authPool =
  globalForPool.authPool ??
  new Pool({
    connectionString: connectionString || undefined,
    max: Number(process.env.AUTH_DATABASE_POOL_SIZE || 5),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPool.authPool = authPool;
}

/**
 * Kurulumda hiç hesap var mı. Zotion self-hosted ve **tek kurulum sahibi**
 * modelinde çalışır: ilk hesap sunucuyu kurar, sonrasında kayıt kapanır.
 *
 * `COUNT(*)` yerine `LIMIT 1` — tek ihtiyacımız "en az bir tane var mı",
 * tablo büyüdükçe sayım maliyeti ödemenin anlamı yok.
 */
export async function hasAnyUser(): Promise<boolean> {
  const result = await authPool.query('SELECT 1 FROM "user" LIMIT 1');
  return result.rowCount !== null && result.rowCount > 0;
}

export const auth = betterAuth({
  appName: "Zotion",
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: authPool,
  trustedOrigins: [appUrl],
  emailAndPassword: {
    enabled: true,
    // Self-hosted setups have no mail provider wired up by default.
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  user: {
    changeEmail: { enabled: true },
  },
  databaseHooks: {
    user: {
      create: {
        // Kaydı asıl kapatan yer BURASI. /register sayfasının sunucu
        // tarafındaki yönlendirmesi yalnızca UI kolaylığı — /api/auth/sign-up/email
        // doğrudan çağrılabildiği için kural veritabanı yazımının önünde
        // durmalı, yoksa URL'i bilen herkes hesap açabilir.
        before: async (user) => {
          if (await hasAnyUser()) {
            throw new APIError("FORBIDDEN", {
              message:
                "This Zotion server has already been set up. Registration is closed.",
            });
          }
          return { data: user };
        },
      },
    },
  },
  advanced: {
    // Behind a reverse proxy the app is served over https on a single origin.
    useSecureCookies: appUrl.startsWith("https://"),
  },
  plugins: [
    jwt({
      jwks: {
        // Convex validates tokens against this key set; RS256 is what its
        // OIDC verifier expects.
        keyPairConfig: { alg: "RS256", modulusLength: 2048 },
      },
      jwt: {
        issuer: appUrl,
        audience: JWT_AUDIENCE,
        expirationTime: "1h",
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
