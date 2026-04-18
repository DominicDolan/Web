import {solidServerFunctions} from "@web/server-functions";
import solidPlugin from "vite-plugin-solid";
import {defineConfig} from "vite";
import tailwindcss from "@tailwindcss/vite";
import {getPlatformProxy} from "wrangler";

let cloudflareProxyPromise: Promise<Awaited<ReturnType<typeof getPlatformProxy>>> | undefined;

export default defineConfig({
    appType: "spa",
    plugins: [
        solidServerFunctions({
            serverEntry: "/home/doghouse/Source/SolidJS/web/apps/themeBuilder/src/server.tsx",
            async createRequestContext() {
                cloudflareProxyPromise ??= getPlatformProxy({
                    configPath: "./wrangler.jsonc",
                });

                const proxy = await cloudflareProxyPromise;

                return {
                    cloudflare: {
                        env: proxy.env,
                        context: proxy.ctx,
                    },
                };
            },
        }),
        solidPlugin(),
        tailwindcss()
    ],
    resolve: {tsconfigPaths: true}
})
