export const SERVER_FUNCTIONS_ENDPOINT = '/__server_functions'

export type ServerFunction<TArgs extends unknown[] = unknown[], TResult = unknown> = (
  ...args: TArgs
) => Promise<TResult>

export type ServerFunctionHandler = (...args: unknown[]) => unknown | Promise<unknown>

export interface ServerFunctionRequestPayload {
  id: string
  args: unknown[]
}

export interface ServerFunctionSuccess<TResult = unknown> {
  ok: true
  value: TResult
}

export interface ServerFunctionFailure {
  ok: false
  error: string
}

export type ServerFunctionResponse<TResult = unknown> =
  | ServerFunctionSuccess<TResult>
  | ServerFunctionFailure

export function createServerFn<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => TResult | Promise<TResult>,
): ServerFunction<TArgs, Awaited<TResult>> {
  return handler as ServerFunction<TArgs, Awaited<TResult>>
}

export async function callServerFunction<TResult>(
  id: string,
  args: unknown[],
): Promise<TResult> {
  const response = await fetch(SERVER_FUNCTIONS_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ id, args } satisfies ServerFunctionRequestPayload),
  })

  const payload = (await response.json()) as ServerFunctionResponse<TResult>

  if (!response.ok || !payload.ok) {
    const message = payload.ok
      ? `Server function \"${id}\" failed with status ${response.status}.`
      : payload.error

    throw new Error(message)
  }

  return payload.value
}

