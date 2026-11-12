import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Same-origin proxies to NASA's public data servers. Browsers cannot read these servers directly (cross-origin rules),
// so the app asks /nasa/... and the dev server (here) or Vercel (vercel.json) forwards the request. No keys, no logins.
// Keep these in sync with the rewrites in vercel.json.
const nasaProxy = {
  '/nasa/giss': { target: 'https://data.giss.nasa.gov', changeOrigin: true, rewrite: (p: string) => p.replace(/^\/nasa\/giss/, '/gistemp/tabledata_v4') },
  '/nasa/nsidc': { target: 'https://noaadata.apps.nsidc.org', changeOrigin: true, rewrite: (p: string) => p.replace(/^\/nasa\/nsidc/, '/NOAA/G02135/north/daily/data') },
  '/nasa/ornl': { target: 'https://modis.ornl.gov', changeOrigin: true, rewrite: (p: string) => p.replace(/^\/nasa\/ornl/, '/rst/api/v1') },
}

// One config for the app (dev server and build) and for the UI tests (Vitest).
// Core logic tests run with Node's own test runner (see package.json "test:core").
export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/NASA-SPACE-APPS-CHALLENGE-EARTHSONIC/' : '/',
  plugins: [react(), tailwindcss()],
  server: { proxy: nasaProxy },
  preview: { proxy: nasaProxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/ui/setup.ts'],
    include: ['tests/ui/**/*.test.{ts,tsx}'],
  },
})
