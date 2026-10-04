import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, /api is forwarded to the backend, so the website and API share one origin (no CORS setup needed).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": { target: "http://127.0.0.1:5000", changeOrigin: true } } },
  preview: { proxy: { "/api": { target: "http://127.0.0.1:5000", changeOrigin: true } } },
  test: { environment: "node", include: ["src/**/*.test.js"] },
});
