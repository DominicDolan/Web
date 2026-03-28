import {createSolid2VinxiApp} from "@web/vinxi/config";
import UnoCSS from "unocss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default createSolid2VinxiApp({
    clientEntry: "./src/client.tsx",
    serverEntry: "./src/server.tsx",
    solid: { refresh: { disabled: true }},
    client: {
        plugins: [UnoCSS(), tsconfigPaths()]
    }
})
