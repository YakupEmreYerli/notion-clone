import { getMigrations } from "better-auth/db/migration";

import { auth } from "./auth";

let migrated: Promise<void> | undefined;

export const runAuthMigrations = () => {
  migrated ??= (async () => {
    try {
      const { runMigrations, toBeCreated, toBeAdded } = await getMigrations(
        auth.options,
      );

      if (!toBeCreated.length && !toBeAdded.length) return;

      await runMigrations();
      console.log("[auth] database schema is up to date");
    } catch (error) {
      migrated = undefined;
      console.error("[auth] failed to run database migrations", error);
      throw error;
    }
  })();

  return migrated;
};
