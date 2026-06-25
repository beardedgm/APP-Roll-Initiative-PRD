import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split the eagerly-loaded vendor libs out of the entry chunk so they
        // cache independently across deploys and download in parallel. Route-
        // only deps (marked, dompurify) are intentionally left in their lazy
        // route chunk — never pull those into an eager vendor chunk.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@sentry')) return 'sentry';
          if (id.includes('posthog')) return 'analytics';
          if (id.includes('@tanstack')) return 'query';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|react-helmet-async|scheduler)[\\/]/.test(id)) {
            return 'react-vendor';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
