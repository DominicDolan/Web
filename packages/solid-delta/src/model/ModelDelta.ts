import {Model} from "@web/schema";

type KeySanitize<Type extends string | number | symbol> = Type extends string ? Type : Type extends number ? `${Type}` : Type extends symbol ? string : never

export type ModelDelta<T extends Model> = {
    /** Stable event id. Optional on in-memory deltas; D1 persistence generates one when absent. */
    eventId?: string
    id: string
    path: KeySanitize<keyof T> | `${KeySanitize<keyof T>}.${string}` | "",
    value: any
    timestamp: number
}
