import type { IncomingMessage, ServerResponse } from 'node:http'
import { runWithEvent, type ServerFunctionEvent } from './runtime/event.ts'

export const CREATE_SERVER_REQUEST_HANDLER_SYMBOL = Symbol.for('web.server-functions.create-server-request-handler')
export const CREATE_SERVER_NO_LISTEN_ENV = 'WEB_SERVER_FUNCTIONS_NO_LISTEN'

export type CreateServerRequestEvent = ServerFunctionEvent<IncomingMessage, ServerResponse, unknown>

export type CreateServerRequestResult =
  | ArrayBuffer
  | Blob
  | FormData
  | ReadableStream
  | Response
  | URLSearchParams
  | string
  | number
  | boolean
  | readonly unknown[]
  | Record<string, unknown>
  | null

export interface CreateServerRequestHandler {
  (event: CreateServerRequestEvent): Promise<CreateServerRequestResult | undefined> | CreateServerRequestResult | undefined
}

export function getCreateServerRequestHandler(target: unknown) {
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
    return undefined
  }

  return (target as { [CREATE_SERVER_REQUEST_HANDLER_SYMBOL]?: CreateServerRequestHandler })[CREATE_SERVER_REQUEST_HANDLER_SYMBOL]
}

export async function handleCreateServerRequest(
  handler: CreateServerRequestHandler | undefined,
  event: CreateServerRequestEvent,
) {
  if (!handler) {
    return null
  }

  const result = await runWithEvent(event, () => handler(event))

  if (typeof result === 'undefined') {
    return null
  }

  return toResponse(result, event.responseHeaders)
}

function toResponse(result: CreateServerRequestResult, responseHeaders: Headers) {
  if (result instanceof Response) {
    return mergeResponseHeaders(result, responseHeaders)
  }

  if (typeof result === 'string'
    || result instanceof ArrayBuffer
    || result instanceof Blob
    || result instanceof FormData
    || result instanceof ReadableStream
    || result instanceof URLSearchParams) {
    return new Response(result, { headers: responseHeaders })
  }

  return json(result, { headers: responseHeaders })
}

function mergeResponseHeaders(response: Response, responseHeaders: Headers) {
  if ([...responseHeaders].length === 0) {
    return response
  }

  const headers = new Headers(response.headers)
  responseHeaders.forEach((value, key) => {
    headers.set(key, value)
  })

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}

function json(body: number | boolean | readonly unknown[] | Record<string, unknown> | null, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)

  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json; charset=utf-8')
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  })
}
