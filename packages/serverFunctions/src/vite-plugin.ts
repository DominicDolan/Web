import { promises as fs } from 'node:fs'
import { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import ts from 'typescript'
import {
  isRunnableDevEnvironment,
  normalizePath,
  type Plugin,
  type ViteDevServer,
} from 'vite'
import { createServerFunctionEvent, handleServerFunctionRequest } from './runtime'

const CLIENT_PROXY_PREFIX = '\0solid-server-function-client:'
const SERVER_MANIFEST_ID = 'virtual:solid-server-functions/server-manifest'
const RESOLVED_SERVER_MANIFEST_ID = `\0${SERVER_MANIFEST_ID}`
const CLIENT_RUNTIME_IMPORT_ID = '@vite-server/solid-server-functions/client'

export interface SolidServerFunctionsPluginOptions {
  serverEntry: string
}

export function solidServerFunctions(options: SolidServerFunctionsPluginOptions): Plugin {
  let root = process.cwd()

  return {
    name: 'solid-server-functions',
    enforce: 'pre',
    config() {
      return {
        build: {
          outDir: 'dist/client',
        },
        environments: {
          server: {
            consumer: 'server',
            keepProcessEnv: true,
            dev: {
              moduleRunnerTransform: true,
            },
            build: {
              ssr: true,
              target: 'node18',
              outDir: 'dist/server',
              emptyOutDir: false,
              minify: false,
              rollupOptions: {
                input: options.serverEntry,
                output: {
                  entryFileNames: 'index.mjs',
                  format: 'es',
                },
              },
            },
          },
        },
        builder: {
          sharedConfigBuild: true,
          sharedPlugins: true,
          async buildApp(builder) {
            await builder.build(builder.environments.client)
            await builder.build(builder.environments.server)
          },
        },
      }
    },
    configResolved(config) {
      root = config.root
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const request = await toWebRequest(req)
          const response = await handleServerFunctionRequest(
            request,
            async (id) => resolveServerFunctionInDev(server, id),
            {
              event: createServerFunctionEvent({
                request,
                node: { req, res },
              }),
            },
          )

          if (!response) {
            next()
            return
          }

          await sendWebResponse(res, response, req.method ?? 'GET')
        } catch (error) {
          next(error as Error)
        }
      })
    },
    async resolveId(source, importer, options) {
      if (source === SERVER_MANIFEST_ID) {
        return RESOLVED_SERVER_MANIFEST_ID
      }

      if (source.startsWith(CLIENT_PROXY_PREFIX)) {
        return source
      }

      if (this.environment.name !== 'client') {
        return null
      }

      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      })

      if (!resolved || !isServerFunctionFile(resolved.id)) {
        return null
      }

      return `${CLIENT_PROXY_PREFIX}${resolved.id}`
    },
    async load(id) {
      if (id === RESOLVED_SERVER_MANIFEST_ID) {
        return createServerManifestModule(root)
      }

      if (!id.startsWith(CLIENT_PROXY_PREFIX)) {
        return null
      }

      const filePath = cleanModuleId(id.slice(CLIENT_PROXY_PREFIX.length))
      return createClientProxyModule(root, filePath)
    },
  }
}

async function resolveServerFunctionInDev(server: ViteDevServer, id: string) {
  const environment = server.environments.server

  if (!environment || !isRunnableDevEnvironment(environment)) {
    throw new Error('The Vite server runtime environment is not available.')
  }

  const [moduleId, exportName] = splitServerFunctionId(id)
  const mod = await environment.runner.import(`/${moduleId}`)
  const handler = exportName === 'default' ? mod.default : mod[exportName]

  if (typeof handler !== 'function') {
    throw new Error(`Server function \"${id}\" does not export a callable function.`)
  }

  return handler as (...args: unknown[]) => unknown
}

async function createClientProxyModule(root: string, filePath: string) {
  const source = await fs.readFile(filePath, 'utf8')
  const exportNames = extractServerExportNames(source, filePath)

  if (exportNames.length === 0) {
    throw new Error(`No exported server functions were found in ${filePath}.`)
  }

  const lines = [`import { callServerFunction } from ${JSON.stringify(CLIENT_RUNTIME_IMPORT_ID)}`]

  for (const exportName of exportNames) {
    const id = toServerFunctionId(root, filePath, exportName)

    if (exportName === 'default') {
      lines.push(`export default (...args) => callServerFunction(${JSON.stringify(id)}, args)`)
      continue
    }

    lines.push(`export const ${exportName} = (...args) => callServerFunction(${JSON.stringify(id)}, args)`)
  }

  return `${lines.join('\n')}\n`
}

async function createServerManifestModule(root: string) {
  const files = await findServerFunctionFiles(path.resolve(root, 'src'))
  const imports: string[] = []
  const entries: string[] = []

  for (const [index, filePath] of files.entries()) {
    const exportNames = extractServerExportNames(await fs.readFile(filePath, 'utf8'), filePath)

    if (exportNames.length === 0) {
      continue
    }

    const localName = `serverModule${index}`
    imports.push(`import * as ${localName} from ${JSON.stringify(toRootModuleId(root, filePath))}`)

    for (const exportName of exportNames) {
      entries.push(
        `  ${JSON.stringify(toServerFunctionId(root, filePath, exportName))}: ${localName}[${JSON.stringify(exportName)}],`,
      )
    }
  }

  return `${imports.join('\n')}\n\nexport const serverFunctions = {\n${entries.join('\n')}\n}\n`
}

async function findServerFunctionFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return findServerFunctionFiles(entryPath)
      }

      return isServerFunctionFile(entryPath) ? [entryPath] : []
    }),
  )

  return files.flat().sort()
}

function extractServerExportNames(source: string, filePath: string) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath),
  )
  const exportNames = new Set<string>()

  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement) && isServerFunctionExpression(statement.expression)) {
      exportNames.add('default')
      continue
    }

    if (!hasExportModifier(statement)) {
      continue
    }

    if (ts.isFunctionDeclaration(statement)) {
      if (hasDefaultModifier(statement)) {
        exportNames.add('default')
      } else if (statement.name) {
        exportNames.add(statement.name.text)
      }

      continue
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !isServerFunctionExpression(declaration.initializer)) {
          continue
        }

        exportNames.add(declaration.name.text)
      }
    }
  }

  return [...exportNames]
}

function hasExportModifier(statement: ts.Statement) {
  const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined
  return modifiers?.some((modifier: ts.ModifierLike) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false
}

function hasDefaultModifier(statement: ts.Statement) {
  const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined
  return modifiers?.some((modifier: ts.ModifierLike) => modifier.kind === ts.SyntaxKind.DefaultKeyword) ?? false
}

function isServerFunctionExpression(expression: ts.Expression | undefined): boolean {
  if (!expression) {
    return false
  }

  return ts.isArrowFunction(expression) || ts.isFunctionExpression(expression) || isCreateServerFnCallExpression(expression)
}

function isCreateServerFnCallExpression(expression: ts.Expression) {
  return (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'createServerFn'
  )
}

function getScriptKind(filePath: string) {
  if (filePath.endsWith('.tsx')) {
    return ts.ScriptKind.TSX
  }

  if (filePath.endsWith('.jsx')) {
    return ts.ScriptKind.JSX
  }

  if (filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) {
    return ts.ScriptKind.JS
  }

  return ts.ScriptKind.TS
}

function splitServerFunctionId(id: string) {
  const separator = id.lastIndexOf('#')

  if (separator === -1) {
    throw new Error(`Invalid server function id \"${id}\".`)
  }

  return [id.slice(0, separator), id.slice(separator + 1)] as const
}

function toServerFunctionId(root: string, filePath: string, exportName: string) {
  return `${normalizePath(path.relative(root, cleanModuleId(filePath)))}#${exportName}`
}

function toRootModuleId(root: string, filePath: string) {
  return `/${normalizePath(path.relative(root, cleanModuleId(filePath)))}`
}

function cleanModuleId(id: string) {
  return id.replace(/[?#].*$/, '')
}

function isServerFunctionFile(id: string) {
  return /\.server\.[cm]?[jt]sx?$/.test(cleanModuleId(id))
}

async function toWebRequest(req: IncomingMessage) {
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
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
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

    req.on('data', (chunk: Buffer | string) => {
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

  res.end(Buffer.from(await response.arrayBuffer()))
}


