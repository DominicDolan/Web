declare module 'virtual:solid-server-functions/server-manifest' {
  export const serverFunctions: Record<string, (...args: unknown[]) => unknown>
}

