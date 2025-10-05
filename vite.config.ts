// frontend/vite.config.ts
import { defineConfig, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

const backend = "http://127.0.0.1:8083";

function sseProxy(): ProxyOptions {
  return {
    target: backend,
    changeOrigin: true,
    secure: false,
    ws: true,
    configure(proxy) {
      proxy.on("error", (err) => console.error("Proxy error:", err));
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.setHeader("Connection", "keep-alive");
        proxyReq.setHeader("Cache-Control", "no-cache");
      });
    },
  };
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/simulate": sseProxy(),
      "/predict": sseProxy(),
      "/train": sseProxy(),
      "/api": sseProxy(),
      "/models": sseProxy(),
      "/outcomes": sseProxy(),
      "/learn": sseProxy(),
    },
  },
  build: {
    // single entry from index.html — don't pass Rollup random inputs
    rollupOptions: {
      input: "index.html",
      output: {
        // optional chunking; safe and zoom-free
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) return "react-vendor";
            if (id.includes("chart.js") || id.includes("react-chartjs-2")) return "chart-vendor";
            if (id.includes("framer-motion")) return "motion-vendor";
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ["chart.js", "react-chartjs-2"],
    exclude: ["chartjs-plugin-zoom"], // make sure it's never pulled in
  },
});
