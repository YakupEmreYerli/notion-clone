export default {
  providers: [
    {
      // Public URL of the Next.js app; it serves the OIDC discovery document
      // and the Better Auth JWKS used to verify incoming tokens.
      domain: process.env.CONVEX_AUTH_ISSUER,
      applicationID: "convex",
    },
  ],
};
