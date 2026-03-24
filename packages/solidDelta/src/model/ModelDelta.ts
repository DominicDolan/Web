
export type ModelDelta<T> = {
    id: string
    path: [keyof T, ...(string | number)[]],
    value: any
    timestamp: number
}
