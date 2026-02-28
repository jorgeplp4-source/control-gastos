/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimiza tree-shaking de Phosphor en dev — evita compilar los 9000+ íconos
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
}
module.exports = nextConfig
