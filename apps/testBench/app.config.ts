//@ts-ignore
import { createApp } from "vinxi";
//@ts-ignore
import { serverFunctions } from "@vinxi/server-functions/plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import solid from "vite-plugin-solid";

export default createApp({
    routers: [
        {
            name: "public",
            type: "static",
            dir: "./public",
        },
        {
            name: "client",
            type: "client",
            handler: "./src/app/client.tsx",
            target: "browser",
            plugins: () => [tsconfigPaths(), serverFunctions.client(), solid({ refresh: { disabled: true }})],
            base: "/base",
        },
        {
            name: "server",
            type: "http",
            handler: "./src/app/server.tsx", // This is required but can be empty
            target: "server",
            plugins: () => [tsconfigPaths(), serverFunctions.server()],
        },
        serverFunctions.router({
            plugins: () => [tsconfigPaths()],
        })
    ],
});
