import { Model } from "@web/schema";
import type { DeltaProjection } from "./DeltaProjection";
import { defineStaleDeltaPolicy, StaleDeltaPolicy } from "./StaleDeltaPolicy";
import { quoteIdentifier } from "./SchemaRuntimeContext";

/**
 * Generates a stale-cleanup guard that only allows deleting a source delta
 * once the given projection has acked it (i.e. its ack column is not null).
 *
 * Convenience wrapper around `defineStaleDeltaPolicy(...)`.
 */
export function defineProjectionAckPolicy<M extends Model>(
    projection: DeltaProjection<M>,
): StaleDeltaPolicy<M> {
    return defineStaleDeltaPolicy(projection.schema, {
        name: `${projection.name}_acked_before_delete`,

        where({ sourceAlias }) {
            return {
                sql: `${sourceAlias}.${quoteIdentifier(projection.ackColumn)} IS NOT NULL`,
                bind: [],
            }
        },
    })
}

