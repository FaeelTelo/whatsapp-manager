import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from 'url';
import path from "path";

// Obter __dirname equivalente em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5000,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    },
    cors: true
  },
  preview: {
    port: 5000,
    strictPort: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});