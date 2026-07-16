import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://192.168.69.163:3456',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://192.168.69.163:3456',
        changeOrigin: true,
      },
    },
  },
})
