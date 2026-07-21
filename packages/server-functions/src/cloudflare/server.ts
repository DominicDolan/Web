/// <reference path="../virtual.d.ts" />

import { serverFunctions } from 'virtual:solid-server-functions/server-manifest'
import {
  createServerFunctionEvent,
  handleServerFunctionRequest,
  runWithEvent,
  type ServerFunctionEvent,
} from './runtime/index.ts'

export type CreateServerRequestEvent<Context = unknown> = ServerFunctionEvent<unknown, unknown, Context>

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

export interface CreateServerRequestHandler<Context = unknown> {
  (event: CreateServerRequestEvent<Context>): Promise<CreateServerRequestResult | undefined> | CreateServerRequestResult | undefined
}

export interface CloudflareExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException?(): void
}

export interface CreateServerOptions<Env = unknown> {
  assets?: (request: Request, env: Env, context: CloudflareExecutionContext) => Promise<Response>
}

export interface CloudflareWorker<Env = unknown> {
  fetch(request: Request, env: Env, context: CloudflareExecutionContext): Promise<Response>
}

export function createServer<Env = unknown>(handler: CreateServerRequestHandler<{ cloudflare: { env: Env, context: CloudflareExecutionContext } }>, options: CreateServerOptions<Env> = {}): CloudflareWorker<Env> {
  return {
    async fetch(request, env, context) {
      const event = createServerFunctionEvent({
        request,
        context: { cloudflare: { env, context } },
      })
      const rpcResponse = await handleServerFunctionRequest(
        request,
        async (id) => {
          const serverFunction = serverFunctions[id]

          if (typeof serverFunction !== 'function') {
            throw new Error(`Unknown server function "${id}".`)
          }

          return serverFunction
        },
        { event },
      )

      if (rpcResponse) {
        return rpcResponse
      }

      const result = await runWithEvent(event, () => handler(event))

      if (typeof result !== 'undefined') {
        return toResponse(result, event.responseHeaders)
      }

      if (options.assets) {
        return options.assets(request, env, context)
      }

      const assets = (env as { ASSETS?: { fetch(request: Request): Promise<Response> } }).ASSETS

      if (assets) {
        return assets.fetch(request)
      }

      return new Response('Not found', { status: 404 })
    },
  }
}

function toResponse(result: CreateServerRequestResult, responseHeaders: Headers) {
  if (result instanceof Response) {
    if ([...responseHeaders].length === 0) {
      return result
    }

    const headers = new Headers(result.headers)
    responseHeaders.forEach((value, key) => headers.set(key, value))
    return new Response(result.body, { headers, status: result.status, statusText: result.statusText })
  }

  if (typeof result === 'string'
    || result instanceof ArrayBuffer
    || result instanceof Blob
    || result instanceof FormData
    || result instanceof ReadableStream
    || result instanceof URLSearchParams) {
    return new Response(result, { headers: responseHeaders })
  }

  const headers = new Headers(responseHeaders)
  headers.set('content-type', headers.get('content-type') ?? 'application/json; charset=utf-8')
  return new Response(JSON.stringify(result), { headers })
}
