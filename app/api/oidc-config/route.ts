import { NextResponse } from "next/server";

import { getAppUrl, JWT_AUDIENCE } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Minimal OIDC discovery document.
 *
 * Convex resolves `domain` from convex/auth.config.js to
 * `<domain>/.well-known/openid-configuration` (rewritten to this route in
 * next.config.mjs) and uses `jwks_uri` to verify Better Auth tokens.
 */
export const GET = async () => {
  const appUrl = getAppUrl();

  return NextResponse.json(
    {
      issuer: appUrl,
      jwks_uri: `${appUrl}/api/auth/jwks`,
      authorization_endpoint: `${appUrl}/api/auth/sign-in`,
      token_endpoint: `${appUrl}/api/auth/token`,
      response_types_supported: ["id_token"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      claims_supported: ["sub", "iss", "aud", "exp", "iat", "email", "name"],
      audiences_supported: [JWT_AUDIENCE],
    },
    { headers: { "cache-control": "public, max-age=60" } },
  );
};
