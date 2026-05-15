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

const nextConfig = {
  distDir: isDevelopment ? ".next-dev" : ".next",
  allowedDevOrigins: ["192.168.1.160"],
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
    return [
      {
        source: "/backend/:path*",
        destination: `${apiUrl}/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;