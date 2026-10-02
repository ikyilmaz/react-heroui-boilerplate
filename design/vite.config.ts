import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/*
 * Claude Design paketi: `design/entry.tsx` → `design/dist/synergy-ui.js` (tek klasik betik,
 * `window.SynergyUI`) ve `synergy-ui.css`. React / ReactDOM paketlenmez, sayfanın küreselleri
 * kullanılır. lucide-react ikonları Fluent karşılıklarıyla değiştirilir (design/lucide-fluent.tsx).
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../src', import.meta.url)),
      'lucide-react': fileURLToPath(new URL('./lucide-fluent.tsx', import.meta.url)),
      'react/jsx-runtime': fileURLToPath(new URL('./jsx-runtime.ts', import.meta.url)),
      'react/jsx-dev-runtime': fileURLToPath(new URL('./jsx-runtime.ts', import.meta.url)),
    },
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL('./entry.tsx', import.meta.url)),
      name: 'SynergyUI',
      formats: ['iife'],
      fileName: () => 'synergy-ui.js',
      cssFileName: 'synergy-ui',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client'],
      output: {
        globals: { react: 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM' },
      },
    },
  },
})
