import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server is reached through the Naoki preview proxy.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, strictPort: true, allowedHosts: true },
})
