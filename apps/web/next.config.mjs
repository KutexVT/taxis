/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite usar el paquete compartido del monorepo sin pre-compilar.
  transpilePackages: ['@taxi/shared'],
  // Salida autocontenida para imagenes Docker ligeras.
  output: 'standalone',
  // Mantiene la cookie de sesion en el mismo origen que la web.
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
