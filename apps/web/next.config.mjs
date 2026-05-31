/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite usar el paquete compartido del monorepo sin pre-compilar.
  transpilePackages: ['@taxi/shared'],
  // Salida autocontenida para imagenes Docker ligeras.
  output: 'standalone',
};

export default nextConfig;
