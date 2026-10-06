import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
    allowedHosts: ['.trycloudflare.com'],
  },
  // Derlemeyi Cloudflare hızlı tüneliyle paylaşmak için (`vite preview` + `cloudflared tunnel`)
  preview: {
    port: 4173,
    allowedHosts: ['.trycloudflare.com'],
  },
})
