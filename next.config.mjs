/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  // Next.js'in dev modunda sol altta gösterdiği "N" rozeti kapatıldı.
  devIndicators: false,
  serverExternalPackages: ["pg"],
  images: {
    // Uploads are served from the app itself (/api/files/<key>) — no remote
    // host needed for those. The entries below are for the built-in cover
    // image gallery (lib/coverGallery.ts): The Met + Cleveland Museum of Art
    // open-access (CC0) CDNs.
    remotePatterns: [
      { protocol: "https", hostname: "images.metmuseum.org" },
      { protocol: "https", hostname: "openaccess-cdn.clevelandart.org" },
    ],
  },
  async rewrites() {
    return [
      {
        // Convex discovers the Better Auth JWKS through this document.
        source: "/.well-known/openid-configuration",
        destination: "/api/oidc-config",
      },
    ];
  },
};

export default nextConfig;
