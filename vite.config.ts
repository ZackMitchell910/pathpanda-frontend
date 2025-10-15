import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget =
    env.SIMETRIX_PROXY_TARGET?.trim() ||
    env.VITE_SIMETRIX_API_BASE?.trim() ||
    env.VITE_PREDICTIVE_API?.trim() ||
    env.VITE_API_BASE?.trim() ||
    'https://api.simetrix.io';

  const proxyPrefixes = ['/simulate', '/predict', '/train', '/runs', '/quant', '/me', '/api', '/session'];
  const proxy = proxyPrefixes.reduce<Record<string, any>>((acc, prefix) => {
    acc[prefix] = {
      target: proxyTarget,
      changeOrigin: true,
      secure: false,
    };
    return acc;
  }, {});

  return {
    plugins: [
      react(),
      tailwind(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy,
    },
  };
});
