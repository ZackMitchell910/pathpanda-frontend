import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase to 1000 kB (or higher as needed)
    sourcemap: true,
  },
  // (Optional) If some third-party code expects `process.env` in the browser:
  define: {
    "process.env": {},
  },
});