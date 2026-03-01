import { defineConfig, presetAttributify, transformerAttributifyJsx } from "unocss";
import {layoutPreset} from "@web/unolayout";

export default defineConfig({
  rules: [],
  presets: [presetAttributify(), layoutPreset],
  transformers: [transformerAttributifyJsx()],
});
