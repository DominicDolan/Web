/// <reference path="./virtual.d.ts" />

import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { serverFunctions } from 'virtual:solid-server-functions/server-manifest'
import {
  CREATE_SERVER_NO_LISTEN_ENV,
  CREATE_SERVER_REQUEST_HANDLER_SYMBOL,
  handleCreateServerRequest,
  type CreateServerRequestHandler,
} from './create-server-request.ts'
import {
  createServerFunctionEvent,
  handleServerFunctionRequest,
} from './runtime/index.ts'

const textTypes = new Set([
  'application/javascript',
  'application/json',
  'image/svg+xml',
  'text/css',
  'text/html',
  'text/plain',
])

const mimeTypes = new Map<string, string>([
  ['.css', 'text/css'],
  ['.html', 'text/html'],
  ['.js', 'application/javascript'],
  ['.json', 'application/json'],
  ['.mjs', 'application/javascript'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
])

export interface CreateServerOptions {
  clientDistDir?: string
  clientIndexFile?: string
  port?: number
  onListen?(port: number, server: Server): void
}

interface CreateServerRuntime extends Server {
  [CREATE_SERVER_REQUEST_HANDLER_SYMBOL]?: CreateServerRequestHandler
}

export function createServer(options?: CreateServerOptions): Server
export function createServer(handler: CreateServerRequestHandler, options?: CreateServerOptions): Server
export function createServer(
  handlerOrOptions: CreateServerOptions | CreateServerRequestHandler = {},
  maybeOptions: CreateServerOptions = {},
) {
  const handleRequest = typeof handlerOrOptions === 'function' ? handlerOrOptions : undefined
  const options = typeof handlerOrOptions === 'function' ? maybeOptions : handlerOrOptions
  const port = options.port ?? Number(process.env.PORT ?? 3000)
  const clientDistDir = options.clientDistDir ?? resolveClientDistDir()
  const clientIndexFile = options.clientIndexFile ?? 'index.html'
  let documentHtmlPromise: Promise<string> | undefined

  const server = createHttpServer(async (req, res) => {
    try {
      await handleNodeRequest(req, res, {
        clientDistDir,
        clientIndexFile,
        handleRequest,
        port,
        getDocumentHtml() {
          documentHtmlPromise ??= loadDocumentHtml(clientDistDir, clientIndexFile)
          return documentHtmlPromise
        },
      })
    } catch (error) {
      res.statusCode = 500
      res.setHeader('content-type', 'text/plain; charset=utf-8')
      res.end(error instanceof Error ? error.message : 'Unexpected server error.')
    }
  })

  ;(server as CreateServerRuntime)[CREATE_SERVER_REQUEST_HANDLER_SYMBOL] = handleRequest

  if (process.env[CREATE_SERVER_NO_LISTEN_ENV] !== '1') {
    server.listen(port, () => {
      options.onListen?.(port, server)
    })
  }

  return server
}

interface HandleNodeRequestOptions {
  clientDistDir: string
  clientIndexFile: string
  getDocumentHtml(): Promise<string>
  handleRequest?: CreateServerRequestHandler
  port: number
}

async function handleNodeRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: HandleNodeRequestOptions,
) {
  const request = await toWebRequest(req, options.port)
  const event = createServerFunctionEvent({
    request,
    node: { req, res },
  })
  const rpcResponse = await handleServerFunctionRequest(
    request,
    async (id) => {
      const handler = serverFunctions[id]

      if (typeof handler !== 'function') {
        throw new Error(`Unknown server function \"${id}\".`)
      }

      return handler
    },
    { event },
  )

  if (rpcResponse) {
    await sendWebResponse(res, rpcResponse, req.method ?? 'GET')
    return
  }

  const customResponse = await handleCreateServerRequest(options.handleRequest, event)

  if (customResponse) {
    await sendWebResponse(res, customResponse, req.method ?? 'GET')
    return
  }

  const method = req.method ?? 'GET'

  if (method !== 'GET' && method !== 'HEAD') {
    res.statusCode = 404
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.end('Not found')
    return
  }

  const url = new URL(request.url)
  const isDocumentRequest = url.pathname === '/' || url.pathname === `/${options.clientIndexFile}`

  if (isDocumentRequest) {
    await serveRenderedDocument(options, res, method)
    return
  }

  const filePath = toAssetPath(options.clientDistDir, url.pathname)
  const served = await tryServeFile(options.clientDistDir, filePath, res, method)

  if (served) {
    return
  }

  await serveRenderedDocument(options, res, method)
}

async function serveRenderedDocument(
  options: Pick<HandleNodeRequestOptions, 'getDocumentHtml'>,
  res: ServerResponse,
  method: string,
) {
  const html = await options.getDocumentHtml()

  res.statusCode = 200
  res.setHeader('content-type', 'text/html; charset=utf-8')

  if (method === 'HEAD') {
    res.end()
    return
  }

  res.end(html)
}

export function getCreateServerRequestHandler(target: unknown) {
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
    return undefined
  }

  return (target as CreateServerRuntime)[CREATE_SERVER_REQUEST_HANDLER_SYMBOL]
}

function toAssetPath(clientDistDir: string, pathname: string) {
  const normalized = pathname === '/' ? '/index.html' : pathname
  const safePath = path.normalize(normalized).replace(/^[\\/]+/, '')

  return path.resolve(clientDistDir, safePath)
}

async function tryServeFile(
  clientDistDir: string,
  filePath: string,
  res: ServerResponse,
  method: string,
) {
  if (!isInsideClientDist(clientDistDir, filePath)) {
    return false
  }

  try {
    await serveFile(filePath, res, method)
    return true
  } catch {
    return false
  }
}

async function serveFile(filePath: string, res: ServerResponse, method: string) {
  const body = await readFile(filePath)
  const contentType = mimeTypes.get(path.extname(filePath)) ?? 'application/octet-stream'
  const value = textTypes.has(contentType) ? `${contentType}; charset=utf-8` : contentType

  res.statusCode = 200
  res.setHeader('content-type', value)

  if (method === 'HEAD') {
    res.end()
    return
  }

  res.end(body)
}

function isInsideClientDist(clientDistDir: string, filePath: string) {
  const relative = path.relative(clientDistDir, filePath)
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

async function toWebRequest(req: IncomingMessage, port: number): Promise<Request> {
  const origin = `http://${req.headers.host ?? `localhost:${port}`}`
  const url = new URL(req.url ?? '/', origin)
  const headers = new Headers()

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item)
      }
      continue
    }

    if (typeof value === 'string') {
      headers.set(key, value)
    }
  }

  const method = req.method ?? 'GET'
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readIncomingMessage(req)
  const requestBody = body && body.length > 0 ? new Blob([new Uint8Array(body)]) : undefined

  return new Request(url, {
    method,
    headers,
    body: requestBody,
  })
}

function readIncomingMessage(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    req.on('error', reject)
  })
}

async function sendWebResponse(res: ServerResponse, response: Response, method: string) {
  res.statusCode = response.status

  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  if (method === 'HEAD') {
    res.end()
    return
  }

  const body = Buffer.from(await response.arrayBuffer())
  res.end(body)
}

async function loadDocumentHtml(clientDistDir: string, clientIndexFile: string): Promise<string> {
  return readFile(path.join(clientDistDir, clientIndexFile), 'utf8')
}

function resolveClientDistDir() {
  const entryFile = process.argv[1]

  if (!entryFile) {
    throw new Error('Unable to infer the server entry path for createServer().')
  }

  return path.resolve(path.dirname(entryFile), '../client')
}

