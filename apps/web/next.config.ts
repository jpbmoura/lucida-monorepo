import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      // Permite anexar PDF/DOCX ao form de criar prova.
      bodySizeLimit: "25mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.lucidaexam.com" }],
        destination: "https://lucidaexam.com/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${apiUrl}/api/auth/:path*`,
      },
      {
        source: "/v1/:path*",
        destination: `${apiUrl}/v1/:path*`,
      },
    ];
  },
  // pptxgenjs (export de slides client-side) importa `node:fs`/`node:https`
  // atrás de guardas de ambiente. No bundle do browser, reescrevemos o esquema
  // `node:` e stubamos esses módulos como vazios — os caminhos Node nunca rodam.
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        https: false,
        http: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        zlib: false,
        util: false,
        assert: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;
