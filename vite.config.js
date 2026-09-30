import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  // vitest 配置：仅对 __tests__ 目录生效，environment 固定 node 以隔离 react/tailwind 插件
  test: {
    environment: 'node',
    include: [
      'server/**/__tests__/**/*.test.js',
      'src/**/__tests__/**/*.test.js',
    ],
  },
})
