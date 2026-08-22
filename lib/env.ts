/**
 * Runtime environment helpers.
 *
 * Everything is read at runtime (never inlined at build time) so the same
 * Docker image can be deployed to any domain / storage endpoint.
 */

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const getAppUrl = () => {
  const url =
    process.env.APP_URL ||
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  return stripTrailingSlash(url);
};

export const getConvexUrl = () =>
  stripTrailingSlash(
    process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "",
  );

/** Audience claim Convex expects (`applicationID` in convex/auth.config.js). */
export const JWT_AUDIENCE = "convex";
