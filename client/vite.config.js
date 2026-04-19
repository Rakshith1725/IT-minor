import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  optimizeDeps: {
    include: ['monaco-editor/esm/vs/editor/editor.worker'],
  },
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('monaco-editor')) return 'monaco';
          if (id.includes('d3')) return 'd3';
          if (id.includes('recharts')) return 'recharts';
        }
      }
    }
  }
})