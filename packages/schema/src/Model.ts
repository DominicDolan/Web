import {z} from "zod";

export const modelSchema = z.object({
    id: z.string(),
    updatedAt: z.number()
})

export type Model = z.infer<typeof modelSchema>

export type PartialModel<M extends Model> = Model & Partial<ModelData<M>>

export type ModelData<M extends Model> = Omit<M, "id" | "updatedAt">
