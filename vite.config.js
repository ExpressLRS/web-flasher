import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  appType: 'mpa',
  plugins: [vue()],
  base: '/web-flasher/'
})
