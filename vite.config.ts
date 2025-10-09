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
  // (Optional) If some third-party code expects `process.env` in the browser:
  define: {
    "process.env": {},
  build: { sourcemap: true }
  },
});
