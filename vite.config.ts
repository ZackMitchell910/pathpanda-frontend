import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/simulate': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WS proxying for SSE
        configure: (proxy, options) => {
          // Log proxy errors for debugging
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
          });
          // Ensure keep-alive for SSE/streaming
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Connection', 'keep-alive');
            proxyReq.setHeader('Cache-Control', 'no-cache');
          });
        },
      }, // Added closing brace
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'chart.js', 'chartjs-plugin-zoom', 'framer-motion', 'react-hot-toast'],
          app: ['./src/App.tsx', './src/components/FanChart.tsx'],
        },
      },
      // Apply the same to other entries
      '/news': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Connection', 'keep-alive');
            proxyReq.setHeader('Cache-Control', 'no-cache');
          });
        },
      },
      '/train': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Connection', 'keep-alive');
            proxyReq.setHeader('Cache-Control', 'no-cache');
          });
        },
      },
      '/predict': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Connection', 'keep-alive');
            proxyReq.setHeader('Cache-Control', 'no-cache');
          });
        },
      },
      '/models': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Connection', 'keep-alive');
            proxyReq.setHeader('Cache-Control', 'no-cache');
          });
        },
      },
    },
  },
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.[jt]sx?$/,
  },
});