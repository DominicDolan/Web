
import { definePlugin } from "nitro";
import { getPlatformProxy } from "wrangler";

export default definePlugin(async (nitroApp) => {
    const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev";

    if (isDev) {
        const proxy = await getPlatformProxy();

        if (proxy == null) {
            throw new Error("No Cloudflare Proxy found")
        }

        nitroApp.hooks.hook("request", (event) => {
            (event as any).context.cloudflare = {
                env: proxy.env,
                context: proxy.ctx,
            };
        });

    }
});
