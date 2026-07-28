import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-src 'self' https://embed.styledcalendar.com; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
