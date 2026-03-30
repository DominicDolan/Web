import {createSolid2VinxiApp} from "@web/vinxi/config";
import tsconfigPaths from "vite-tsconfig-paths";
import UnoCSS from "unocss/vite";


export default createSolid2VinxiApp({
  clientEntry: "./src/client.tsx",
  serverEntry: "./src/server.tsx",
  solid: { refresh: { disabled: true }},
  client: {
    plugins: [UnoCSS(), tsconfigPaths()]
  },
  server: {
    plugins: [tsconfigPaths()]
  },
  serverFunctions: {
    plugins: [tsconfigPaths()]
  },
  nitroPlugins: ["@web/d1/plugin"]
})
