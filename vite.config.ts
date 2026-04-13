import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify('1.3.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
