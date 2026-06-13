import {z} from "zod";

export const modelSchema = {
    id: z.string(),
    updatedAt: z.number()
}

export type Model = {
    id: string,
    updatedAt: number
}

export type PartialModel<M extends Model> = Model & Partial<ModelData<M>>

export type ModelData<M extends Model> = Omit<M, "id" | "updatedAt">
