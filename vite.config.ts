import path from 'node:path'
import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// The TanStack Router plugin MUST be listed before react(). It generates
// src/routeTree.gen.ts from src/routes/. https://vite.dev/config/
// Static SPA only — no SSR/RSC/API routes (FFE-005). Ships to Vercel.
export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
