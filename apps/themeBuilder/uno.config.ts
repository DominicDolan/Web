import {defineConfig, presetAttributify, transformerAttributifyJsx} from "unocss"
import {layoutPreset} from "@web/lins/layout"

export default defineConfig({
    rules: [],
    presets: [
        layoutPreset,
        presetAttributify()
    ],
    transformers: [
        transformerAttributifyJsx()
    ]
})
