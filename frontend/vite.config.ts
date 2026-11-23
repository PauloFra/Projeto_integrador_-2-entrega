import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const alvoApi = env.VITE_API_PROXY ?? 'http://localhost:3333';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: false,
      // O frontend chama "/api/..." e o Vite encaminha para a API Node.
      // Assim o navegador nunca precisa lidar com CORS em desenvolvimento.
      proxy: {
        '/api': {
          target: alvoApi,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': { target: alvoApi, changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
