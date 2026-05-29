import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/campaign": "http://localhost:3000",
      "/players": "http://localhost:3000",
      "/aliens": "http://localhost:3000",
      "/combat-log": "http://localhost:3000",
    },
  },
})
