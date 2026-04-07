import solid from "vite-plugin-solid";
//@ts-ignore
import { createApp } from "vinxi";
//@ts-ignore
import { serverFunctions } from "@vinxi/server-functions/plugin";

export type Solid2VinxiConfig = {
    clientEntry: string
    serverEntry: string
    apiEntry: string
    solid?: Parameters<typeof solid>[0]
    client?: {
        plugins?: Array<any>
    },
    server?: {
        plugins?: Array<any>
    },
    serverFunctions?: Parameters<typeof serverFunctions.router>[0],
    nitroPlugins?: Array<string>
}

export function createSolid2VinxiApp(config: Solid2VinxiConfig) {
    const solidConfig = config.solid ?? {}

    return createApp({
        routers: [
            {
                name: "public",
                type: "static",
                dir: "./public",
            },
            {
                name: "client",
                type: "client",
                handler: config.clientEntry,
                target: "browser",
                plugins: () => [serverFunctions.client(), solid(solidConfig), ...config.client?.plugins ?? []],
                base: "/base",
            },
            {
                name: "api",
                type: "http",
                handler: config.apiEntry, // This is required but can be empty
                target: "server",
                base: "/api",
            },
            {
                name: "server",
                type: "http",
                handler: config.serverEntry, // This is required but can be empty
                target: "server",
                plugins: () => [serverFunctions.server(), ...config.server?.plugins ?? []],
            },
            serverFunctions.router({
                plugins: () => config.serverFunctions?.plugins ?? [],
            }),
        ],
        server: {
            preset: "cloudflare-module",
            rollupConfig: {
                external: ["__STATIC_CONTENT_MANIFEST", "node:async_hooks"],
            },
            plugins: config.nitroPlugins ?? [],
            experimental: {
                asyncContext: true,
            },
        },
    });
}

