import {Model} from "@web/schema";

type KeySanitize<Type extends string | number | symbol> = Type extends string ? Type : Type extends number ? `${Type}` : Type extends symbol ? string : never

export type ModelDelta<T extends Model> = {
    id: string
    path: KeySanitize<keyof T> | `${KeySanitize<keyof T>}.${string}` | "",
    value: any
    timestamp: number
}
