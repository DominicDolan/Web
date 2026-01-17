import {defineConfig, transformerAttributifyJsx} from "unocss"
import presetAttributify from '@unocss/preset-attributify'
import {layoutPreset} from "@theme-builder/common/style/layout"

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
