import {
  SERVER_FUNCTIONS_ENDPOINT,
  type ServerFunctionFailure,
  type ServerFunctionHandler,
  type ServerFunctionRequestPayload,
  type ServerFunctionSuccess,
} from './server-functions.ts'
import { createServerFunctionEvent, runWithEvent, type ServerFunctionEvent } from './event.ts'

export interface ResolveServerFunction {
  (id: string): Promise<ServerFunctionHandler> | ServerFunctionHandler
}

export interface HandleServerFunctionRequestOptions<NodeRequest = unknown, NodeResponse = unknown> {
  event?: ServerFunctionEvent<NodeRequest, NodeResponse>
}

export async function handleServerFunctionRequest(
  request: Request,
  resolveServerFunction: ResolveServerFunction,
  options: HandleServerFunctionRequestOptions = {},
): Promise<Response | null> {
  const url = new URL(request.url)

  if (url.pathname !== SERVER_FUNCTIONS_ENDPOINT) {
    return null
  }

  if (request.method !== 'POST') {
    return json<ServerFunctionFailure>(
      { ok: false, error: 'Method not allowed. Use POST for server function calls.' },
      {
        status: 405,
        headers: {
          Allow: 'POST',
        },
      },
    )
  }

  let payload: ServerFunctionRequestPayload

  try {
    payload = (await request.json()) as ServerFunctionRequestPayload
  } catch {
    return json<ServerFunctionFailure>(
      { ok: false, error: 'Invalid JSON payload.' },
      { status: 400 },
    )
  }

  if (typeof payload.id !== 'string' || !Array.isArray(payload.args)) {
    return json<ServerFunctionFailure>(
      { ok: false, error: 'Invalid server function payload.' },
      { status: 400 },
    )
  }

  const event = options.event ?? createServerFunctionEvent({ request })

  try {
    const handler = await resolveServerFunction(payload.id)
    const value = await runWithEvent(event, () => handler(...payload.args))

    return json<ServerFunctionSuccess>({ ok: true, value }, { headers: event.responseHeaders })
  } catch (error) {
    return json<ServerFunctionFailure>(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server function error.',
      },
      {
        status: 500,
        headers: event.responseHeaders,
      },
    )
  }
}

function json<T>(body: T, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)

  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json; charset=utf-8')
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  })
}

