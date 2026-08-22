/**
 * Runs once when the Next.js server boots.
 *
 * Self-hosted deployments have no separate migration step, so the Better Auth
 * tables are created/updated here against the Postgres instance from
 * docker-compose. Set AUTH_AUTO_MIGRATE=false to manage the schema yourself.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.AUTH_AUTO_MIGRATE === "false") return;

  const { runAuthMigrations } = await import("./lib/auth-migrate");
  await runAuthMigrations();
}
