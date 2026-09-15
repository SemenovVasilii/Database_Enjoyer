import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target:
          process.env.API_PROXY_TARGET ??
          loadEnv(mode, process.cwd(), '').API_PROXY_TARGET ??
          'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
}));
