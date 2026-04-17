import {defineConfig} from "vite";
import solidPlugin from "vite-plugin-solid";
import {solidServerFunctions} from "@web/server-functions";


export default defineConfig({
    appType: "spa",
    plugins: [solidServerFunctions({ serverEntry: "/home/doghouse/Source/SolidJS/web/apps/testBench/src/server.tsx"}), solidPlugin()],
    resolve: {tsconfigPaths: true}
})
