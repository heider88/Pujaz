import path from 'node:path'
import type { NextConfig } from 'next'

// Dirección del gateway vista desde el servidor de Next.js.
// En desarrollo es localhost; en Docker, GATEWAY_URL=http://pz-api-ag:4000/graphql (red interna).
const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:4000/graphql'

const nextConfig: NextConfig = {
  // Para Docker: deja en .next/standalone un servidor (server.js) con solo lo necesario,
  // sin node_modules completos. La imagen queda mucho más liviana (KAN-71).
  output: 'standalone',
  // Esta carpeta es la raíz del front (la raíz del repo tiene su propio package-lock.json, el de
  // Playwright): así Next.js no se confunde al empaquetar.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
  cacheComponents: true,
  partialPrefetching: true,
  // En desarrollo, el navegador manda /graphql (HTTP) a Next.js y este lo reenvía al gateway.
  // En Docker lo atiende antes Nginx, que también reenvía el WebSocket.
  async rewrites() {
    return [{ source: '/graphql', destination: GATEWAY_URL }]
  },
}

export default nextConfig
