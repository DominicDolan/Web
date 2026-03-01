import { defineConfig, presetAttributify, transformerAttributifyJsx } from "unocss";

export default defineConfig({
  rules: [],
  presets: [presetAttributify()],
  transformers: [transformerAttributifyJsx()],
});
