import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base keeps both github.io/qiuzhao-schedule/ and qiuzhao.dewyue.com working.
  base: './',
  plugins: [react(), tailwindcss()],
})
