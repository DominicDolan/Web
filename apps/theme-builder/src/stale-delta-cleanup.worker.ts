import { runStaleDeltaCleanup } from "@web/d1"

type StaleDeltaCleanupWorkerEnvironment = {
    DB: D1Database
}

export default {
    async scheduled(_controller: ScheduledController, env: StaleDeltaCleanupWorkerEnvironment, ctx: ExecutionContext) {
        ctx.waitUntil(
            runStaleDeltaCleanup({
                db: env.DB,
                // A generated stale-policy runtime manifest will supply these
                // once policy manifest generation is implemented.
                policies: [],
            }),
        )
    },
} satisfies ExportedHandler<StaleDeltaCleanupWorkerEnvironment>
