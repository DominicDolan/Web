import {defineConfig, transformerAttributifyJsx} from "unocss"
import presetAttributify from '@unocss/preset-attributify'
import {layoutPreset} from "@web/lins/layout"

export default defineConfig({
    rules: [],
    presets: [
        layoutPreset,
        // @ts-ignore
        presetAttributify()
    ],
    transformers: [
        transformerAttributifyJsx()
    ]
})
