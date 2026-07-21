export interface ServerFunctionEvent<
  NodeRequest = unknown,
  NodeResponse = unknown,
  TContext = unknown,
> {
  request: Request
  url: URL
  method: string
  headers: Headers
  responseHeaders: Headers
  context?: TContext
  setHeader(name: string, value: string): void
  appendHeader(name: string, value: string): void
  removeHeader(name: string): void
}

export interface CreateServerFunctionEventOptions<
  NodeRequest = unknown,
  NodeResponse = unknown,
  TContext = unknown,
> {
  request: Request
  context?: TContext
  responseHeaders?: Headers
}

export function createServerFunctionEvent<
  NodeRequest = unknown,
  NodeResponse = unknown,
  TContext = unknown,
>(
  options: CreateServerFunctionEventOptions<NodeRequest, NodeResponse, TContext>,
): ServerFunctionEvent<NodeRequest, NodeResponse, TContext> {
  const responseHeaders = options.responseHeaders ?? new Headers()

  return {
    request: options.request,
    url: new URL(options.request.url),
    method: options.request.method,
    headers: new Headers(options.request.headers),
    responseHeaders,
    context: options.context,
    setHeader(name, value) {
      responseHeaders.set(name, value)
    },
    appendHeader(name, value) {
      responseHeaders.append(name, value)
    },
    removeHeader(name) {
      responseHeaders.delete(name)
    },
  }
}

let activeEvent: ServerFunctionEvent | undefined

export function runWithEvent<T>(event: ServerFunctionEvent, callback: () => T): T {
  const previousEvent = activeEvent
  activeEvent = event

  try {
    const result = callback()

    if (result instanceof Promise) {
      return result.finally(() => {
        activeEvent = previousEvent
      }) as T
    }

    activeEvent = previousEvent
    return result
  } catch (error) {
    activeEvent = previousEvent
    throw error
  }
}

export function getEvent<
  NodeRequest = unknown,
  NodeResponse = unknown,
  TContext = unknown,
>() {
  if (!activeEvent) {
    throw new Error('getEvent() was called outside of a server function request context.')
  }

  return activeEvent as ServerFunctionEvent<NodeRequest, NodeResponse, TContext>
}
