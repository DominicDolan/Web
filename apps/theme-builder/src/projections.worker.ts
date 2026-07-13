import { runDeltaProjections } from "@web/d1"
import { D1Database, ScheduledController, ExecutionContext, ExportedHandler } from "@cloudflare/workers-types"
import { themeReadProjection } from "./models/ThemeDefinition"

type ProjectionWorkerEnvironment = {
    DB: D1Database
}

export default {
    async scheduled(_controller: ScheduledController, env: ProjectionWorkerEnvironment, ctx: ExecutionContext) {
        ctx.waitUntil(
            runDeltaProjections({
                db: env.DB,
                projections: [themeReadProjection],
            }),
        )
    },
} satisfies ExportedHandler<ProjectionWorkerEnvironment>
