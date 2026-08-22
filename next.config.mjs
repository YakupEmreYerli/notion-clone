/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  // Next.js'in dev modunda sol altta gösterdiği "N" rozeti kapatıldı.
  devIndicators: false,
  serverExternalPackages: ["pg"],
  images: {
    // Uploads are served from the app itself (/api/files/<key>), so no remote
    // hosts need to be allow-listed.
    remotePatterns: [],
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
