// Playwright fixture sayfaları (`app/test-fixtures/**/page.fixture.tsx`) yalnızca
// dev/test derlemesinde route'a dönüşür. Production build'inde bu uzantı
// tanınmadığı için sayfalar hiç oluşturulmaz — bundle'a da girmezler.
const isProduction = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // README galerisi kendi build'ini ayrı bir dizine alır
  // (`scripts/gallery/run.mjs`) — böylece çalışan `next dev`'in `.next`'ini
  // ne ezer, ne de onun dev-server kilidine takılır. O build `next start` ile
  // sunulduğu için `output: "standalone"` (yalnızca Docker imajı için gerekli)
  // orada kapatılır; `next start` standalone ile çalışmaz.
  ...(process.env.NEXT_DIST_DIR
    ? { distDir: process.env.NEXT_DIST_DIR }
    : { output: "standalone" }),
  pageExtensions: isProduction
    ? ["tsx", "ts", "jsx", "js"]
    : ["fixture.tsx", "tsx", "ts", "jsx", "js"],
  // Next.js'in dev modunda sol altta gösterdiği "N" rozeti kapatıldı.
  devIndicators: false,
  serverExternalPackages: ["pg"],
  images: {
    // Uploads are served from the app itself (/api/files/<key>) — no remote
    // host needed for those. The entries below are for the built-in cover
    // image gallery (lib/coverGallery.ts): The Met + Cleveland Museum of Art
    // open-access CDNs and Notion's public page-cover catalog.
    remotePatterns: [
      { protocol: "https", hostname: "images.metmuseum.org" },
      { protocol: "https", hostname: "openaccess-cdn.clevelandart.org" },
      {
        protocol: "https",
        hostname: "app.notion.com",
        pathname: "/images/page-cover/**",
      },
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
