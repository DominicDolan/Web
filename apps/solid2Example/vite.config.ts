import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [tailwindcss(), solidPlugin({ refresh: { disabled: true } })],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
  base: "./",
});
