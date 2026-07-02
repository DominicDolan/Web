import {defineConfig, loadEnv} from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import {solidServerFunctions} from "@web/server-functions";
import {getPlatformProxy} from "wrangler";

let cloudflareProxyPromise: Promise<Awaited<ReturnType<typeof getPlatformProxy>>> | undefined;

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), "");
    process.env.SERF_API_KEY ??= env.SERF_API_KEY;
    process.env.SERP_API_KEY ??= env.SERP_API_KEY;

    return {
        appType: "spa",
        plugins: [
            solidServerFunctions({
                serverEntry: "./src/server.tsx",
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
            tailwindcss(),
        ],
        resolve: {tsconfigPaths: true},
    };
});
