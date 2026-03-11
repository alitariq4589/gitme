import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/gitme/',
  server: {
    port: 3000,
    open: true,
    host: true,
    watch: {
      usePolling: true,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'markdown': ['react-markdown', 'remark-gfm', 'rehype-raw'],
          'lucide': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
