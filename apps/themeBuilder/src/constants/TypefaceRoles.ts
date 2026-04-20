
export const typefaceRoles = ["display", "headline", "title", "body", "label"] as const

export const typefaceSizes = ["small", "medium", "large"] as const

export type TypefaceRole = typeof typefaceRoles[number]
export type TypefaceSize = typeof typefaceSizes[number]

export type TypefaceType = "default" | "variant"
