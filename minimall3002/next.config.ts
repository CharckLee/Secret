import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 安全响应头 — 开发环境不加 CSP，避免拦截 Next.js RSC/HMR
  ...(process.env.NODE_ENV === "production"
    ? {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                { key: "X-XSS-Protection", value: "0" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
                {
                  key: "Content-Security-Policy",
                  value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' https: data: blob:",
                    "font-src 'self'",
                    "connect-src 'self'",
                    "frame-ancestors 'none'",
                  ].join("; "),
                },
              ],
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
