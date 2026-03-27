import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Production build → Flask'ın static klasörüne
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/upload':      'http://127.0.0.1:5000',
      '/parse':       'http://127.0.0.1:5000',
      '/analysis':    'http://127.0.0.1:5000',
      '/llm-insights':'http://127.0.0.1:5000',
      '/session':     'http://127.0.0.1:5000',
      '/health':      'http://127.0.0.1:5000',
    },
  },
})
