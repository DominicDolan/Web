import { ZodType } from "zod";
import { Model } from "@web/schema";
import {
    SchemaRuntimeContext,
    resolveSchemaRuntimeInfo,
    sanitizeIdentifierPart,
} from "./SchemaRuntimeContext";
import { ProjectionTableSchema, getProjectionAckColumn } from "./DeltaProjection";

/**
 * A "join" from the primary model to one referenced source table.
 *
 * `resolveId` answers "which foreign row does this primary model currently
 * reference?" `findDependents` answers the reverse question - "which primary
 * rows currently depend on this foreign id?" - which is needed so a change on
 * the *referenced* side re-projects the right primary rows. Since delta
 * tables have no index on arbitrary foreign-key fields, `findDependents` is
 * expected to query the link projection's own target table (which already
 * stores the foreign id), making it cheap.
 */
export type LinkReference<RM extends Model, PM extends Model> = {
    schema: ZodType<RM>
    /** Given the current primary model, which foreign id (if any) does it reference? */
    resolveId: (primary: PM) => string | null | undefined
    /**
     * Given a foreign id that just changed, return the primary model ids that
     * currently depend on it. Typically implemented as a query against the
     * link projection's own target table, e.g.:
     * `SELECT order_id AS id FROM orders_with_customers WHERE customer_id = ?`
     */
    findDependents: (ctx: { db: unknown; id: string }) => Promise<{ results: { id: string }[] }> | { results: { id: string }[] }
}

type ReferenceModelOf<R> = R extends LinkReference<infer RM, any> ? RM : never

export type LinkProjectionContext<
    PM extends Model,
    Refs extends Record<string, LinkReference<any, PM>>,
> = SchemaRuntimeContext<PM> & {
    db: unknown
    id: string
    model: PM | undefined
    refs: { [K in keyof Refs]: ReferenceModelOf<Refs[K]> | undefined }
}

export type ResolvedLinkReference = {
    schema: ZodType<any>
    metadata: unknown
    sourceTable: string
    ackColumn: string
    resolveId: LinkReference<any, any>["resolveId"]
    findDependents: LinkReference<any, any>["findDependents"]
}

export type LinkProjection<
    PM extends Model = any,
    Refs extends Record<string, LinkReference<any, PM>> = Record<string, LinkReference<any, PM>>,
> = {
    kind: "linkProjection"
    name: string
    version: number
    schema: ZodType<PM>
    metadata: unknown
    sourceTable: string
    ackColumn: string
    target: ProjectionTableSchema
    references: { [K in keyof Refs]: ResolvedLinkReference }
    project: (ctx: LinkProjectionContext<PM, Refs>) => Promise<void>
}

export type DefineLinkProjectionOptions<
    PM extends Model,
    Refs extends Record<string, LinkReference<any, PM>>,
> = {
    name: string
    version: number
    target: ProjectionTableSchema
    /** Referenced/"lookup" source tables this projection joins against, keyed by a friendly name. */
    references: Refs
    project: (ctx: LinkProjectionContext<PM, Refs>) => Promise<void>
}

const linkProjectionRegistry: LinkProjection<any, any>[] = []

/**
 * Registers metadata describing a projection that joins a "primary" delta
 * table with one or more other delta tables, useful for linking/denormalizing
 * data across tables where a SQL join over raw deltas would be impractical.
 *
 * Like `defineDeltaProjection(...)`, this only registers metadata - it does
 * not query or mutate D1, start timers, or run projection work.
 *
 * @example
 * ```ts
 * export const orderWithCustomerProjection = defineLinkProjection(orderSchema, {
 *     name: "order_with_customer",
 *     version: 1,
 *
 *     target: createProjectionTable("orders_with_customers")
 *         .addColumn("order_id", "TEXT", { primaryKey: true })
 *         .addColumn("customer_id", "TEXT", { notNull: true })
 *         .addColumn("customer_name", "TEXT")
 *         .addIndex(["customer_id"])
 *         .build(),
 *
 *     references: {
 *         customer: {
 *             schema: customerSchema,
 *             resolveId: (order) => order.customerId,
 *             findDependents: ({ db, id }) =>
 *                 (db as any).prepare(
 *                     `SELECT order_id AS id FROM orders_with_customers WHERE customer_id = ?`
 *                 ).bind(id).all(),
 *         },
 *     },
 *
 *     async project({ db, id, model: order, refs: { customer } }) {
 *         if (!order) {
 *             await (db as any).prepare(`DELETE FROM orders_with_customers WHERE order_id = ?`).bind(id).run()
 *             return
 *         }
 *
 *         await (db as any).prepare(`
 *             INSERT INTO orders_with_customers (order_id, customer_id, customer_name)
 *             VALUES (?, ?, ?)
 *             ON CONFLICT(order_id) DO UPDATE SET
 *                 customer_id = excluded.customer_id,
 *                 customer_name = excluded.customer_name
 *         `).bind(id, order.customerId, customer?.name ?? null).run()
 *     },
 * })
 * ```
 */
export function defineLinkProjection<
    PM extends Model,
    Refs extends Record<string, LinkReference<any, PM>>,
>(
    schema: ZodType<PM>,
    options: DefineLinkProjectionOptions<PM, Refs>,
): LinkProjection<PM, Refs> {
    const { metadata, sourceTable } = resolveSchemaRuntimeInfo(schema)

    const referenceEntries = Object.entries(options.references).map(([name, ref]) => {
        const refInfo = resolveSchemaRuntimeInfo(ref.schema)
        const resolved: ResolvedLinkReference = {
            schema: ref.schema,
            metadata: refInfo.metadata,
            sourceTable: refInfo.sourceTable,
            ackColumn: getProjectionAckColumn(`${options.name}_${sanitizeIdentifierPart(name)}`, options.version),
            resolveId: ref.resolveId,
            findDependents: ref.findDependents,
        }
        return [name, resolved] as const
    })

    const references = Object.fromEntries(referenceEntries) as LinkProjection<PM, Refs>["references"]

    const projection: LinkProjection<PM, Refs> = {
        kind: "linkProjection",
        name: options.name,
        version: options.version,
        schema,
        metadata,
        sourceTable,
        ackColumn: getProjectionAckColumn(options.name, options.version),
        target: options.target,
        references,
        project: options.project,
    }

    linkProjectionRegistry.push(projection)

    return projection
}

/** Returns all link projections registered so far via `defineLinkProjection(...)`. */
export function getRegisteredLinkProjections(): ReadonlyArray<LinkProjection<any, any>> {
    return linkProjectionRegistry
}

/** Clears the link projection registry. Intended for use by `generateSchema` between runs and in tests. */
export function clearLinkProjectionRegistry() {
    linkProjectionRegistry.length = 0
}

