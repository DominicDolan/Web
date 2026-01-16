/**
 * Global context for schema generation that can be set by the build script
 */

export type SchemaGenerationContext = {
    oldSchemas: Map<string, string>
}

let context: SchemaGenerationContext | null = null

export function setSchemaContext(ctx: SchemaGenerationContext) {
    context = ctx
}

export function getSchemaContext(): SchemaGenerationContext | null {
    return context
}

export function clearSchemaContext() {
    context = null
}
