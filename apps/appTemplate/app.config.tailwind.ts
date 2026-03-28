import {createSolid2VinxiApp} from "@web/vinxi/config";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from '@tailwindcss/vite'

export default createSolid2VinxiApp({
  clientEntry: "./src/client.tsx",
  serverEntry: "./src/server.tsx",
  solid: { refresh: { disabled: true }},
  client: {
    plugins: [tailwindcss(), tsconfigPaths()]
  }
})
