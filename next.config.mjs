/** @type {import('next').NextConfig} */
const DEFAULT_API_URL = "http://localhost:5000/api";

function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

function getApiUrl() {
  return trimTrailingSlash(
    process.env.API_URL
      ?? process.env.BACKEND_API_URL
      ?? process.env.NEXT_PUBLIC_API_URL
      ?? DEFAULT_API_URL,
  );
}

function getBackendUrl(apiUrl) {
  return trimTrailingSlash(process.env.BACKEND_URL ?? apiUrl.replace(/\/api$/, ""));
}

const apiUrl = getApiUrl();
const backendUrl = getBackendUrl(apiUrl);
const isDevelopment = process.env.NODE_ENV === "development";
// The dedicated Olymp Trade experience lives at src/app/olymp-site/** and is
// served from this same deployment via host-based rewrite below, rather than
// a separate app — configurable so a local hosts-file entry can test it.
const OLYMP_SUBDOMAIN_HOST = process.env.OLYMP_SUBDOMAIN_HOST || "olymp.nojai.io";

const nextConfig = {
  distDir: isDevelopment ? ".next-dev" : ".next",
  allowedDevOrigins: ["192.168.1.160"],
  // Remove X-Powered-By header (security + SEO)
  poweredByHeader: false,
  // Compress responses
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        // API/socket proxying must resolve on every host, including the
        // Olymp subdomain below — checked first so the host-based catch-all
        // never swallows these.
        {
          source: "/backend/:path*",
          destination: `${apiUrl}/:path*`,
        },
        {
          source: "/socket.io/:path*",
          destination: `${backendUrl}/socket.io/:path*`,
        },
        // olymp.nojai.io serves a dedicated single-broker landing page +
        // dashboard from src/app/olymp-site/** instead of the normal site.
        {
          source: "/:path*",
          has: [{ type: "host", value: OLYMP_SUBDOMAIN_HOST }],
          destination: "/olymp-site/:path*",
        },
      ],
    };
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;