import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url))
const packageRoot = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
    root: packageRoot,
    test: {
        environment: "node",
        include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    },
    resolve: {
        alias: {
            "@web/d1": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
            "@web/server-functions/runtime": `${workspaceRoot}/packages/server-functions/src/runtime/index.ts`,
            "@web/schema": `${workspaceRoot}/packages/schema/src/index.ts`,
            "@web/solid-delta": `${workspaceRoot}/packages/solid-delta/src/index.ts`,
            "@web/utils": `${workspaceRoot}/packages/utils/src/index.ts`,
            "@web/server-functions": `${workspaceRoot}/packages/server-functions/src/index.ts`,
        },
    },
})
