import { z } from "zod"
import { modelSchema } from "@web/schema"
import {
    createModelSchema,
    defineDeltaLink,
} from "@web/d1"

export const fixtureCustomerSchema = z.object({
    ...modelSchema,
    name: z.string(),
}).meta({
    table: createModelSchema("fixture_customer_events").build(),
})

export const fixtureOrderSchema = z.object({
    ...modelSchema,
    customerId: z.string(),
    total: z.number(),
}).meta({
    table: createModelSchema("fixture_order_events").build(),
})

export const fixtureOrderCustomerLink = defineDeltaLink(fixtureOrderSchema, {
    name: "fixture_orders_with_customer",
    include: ["customerId", "total"],
})
    .link(fixtureCustomerSchema, {
        as: "customer",
        include: ["name"],
        on: (order) => order.customerId,
    })
    .build()
