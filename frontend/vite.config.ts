import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ─── IMPORTANTE ───────────────────────────────────────────────────────────────
// Cambia "my-plugin" por el `name` de tu plugin.json
// El `base` debe coincidir con la ruta donde el core servirá el frontend:
//   /api/v1/p/<nombre-plugin>/ui/
// ─────────────────────────────────────────────────────────────────────────────
export default defineConfig({
  plugins: [react()],
  base: '/api/v1/p/my-plugin/ui/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    // Proxy para desarrollo local — apunta al API corriendo en local
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
