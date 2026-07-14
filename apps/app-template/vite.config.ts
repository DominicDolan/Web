import {defineConfig} from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import {solidServerFunctions} from "@web/server-functions";

export default defineConfig({
    appType: "spa",
    plugins: [
        solidServerFunctions({
            serverEntry: "./src/server.tsx",
        }),
        solidPlugin(),
        tailwindcss(),
    ],
    resolve: {tsconfigPaths: true},
});

