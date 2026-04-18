import { AsyncLocalStorage } from 'node:async_hooks'

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
  node?: {
    req: NodeRequest
    res: NodeResponse
  }
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
  node?: {
    req: NodeRequest
    res: NodeResponse
  }
  responseHeaders?: Headers
}

const eventStorage = getEventStorage()

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
    context: (options.context ?? {}) as TContext,
    node: options.node,
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

export function runWithEvent<T>(event: ServerFunctionEvent, callback: () => T): T {
  return eventStorage.run(event, callback)
}

export function getEvent<
    NodeRequest = unknown,
    NodeResponse = unknown,
    TContext = unknown,
>() {
  const event = eventStorage.getStore()

  if (!event) {
    throw new Error('getEvent() was called outside of a server function request context.')
  }

  return event as ServerFunctionEvent<NodeRequest, NodeResponse, TContext>
}

function getEventStorage() {
  const storageKey = Symbol.for('vite-server.server-function-event-storage')
  const processWithStorage = process as typeof process & Record<PropertyKey, unknown>

  if (!(storageKey in processWithStorage)) {
    processWithStorage[storageKey] = new AsyncLocalStorage<ServerFunctionEvent>()
  }

  return processWithStorage[storageKey] as AsyncLocalStorage<ServerFunctionEvent>
}

