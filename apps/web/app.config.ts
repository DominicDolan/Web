import { defineConfig } from "@solidjs/start/config";
import UnoCSS from 'unocss/vite'

export default defineConfig({
    server: {
        preset: "cloudflare_module",
        rollupConfig: {
            external: ["__STATIC_CONTENT_MANIFEST", "node:async_hooks"],
        },
    },
    vite: {
        plugins: [
            // @ts-ignore
            UnoCSS()
        ],
    }
});
