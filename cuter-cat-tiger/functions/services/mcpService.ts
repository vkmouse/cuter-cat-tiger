/**
 * 最簡單的 MCP 伺服器（Streamable HTTP，無狀態），提供 query（唯讀）與 mutate（寫入）兩個工具，
 * 讓 AI 能查詢與操作貓咪的飲水、進食、排泄紀錄。工具本身的邏輯在 `mcpQueryService`、
 * `mcpMutateService`，說明文字在 `mcpToolDefinitions`。
 *
 * 協定版本：實作的是「舊版」那一代（2025-11-25 及更早，有 `initialize` 握手）。
 * 官方 SDK 與目前多數 client 都支援這一代；2026-07-28 起的新版（每個請求自帶
 * 版本與身分、沒有 `initialize`）尚未實作。收到新版標頭時，依規範的向下相容
 * 機制回 400 加上「不是新版格式」的錯誤內容，讓同時支援新舊版的 client 自動
 * 退回 `initialize` 流程（見 MCP 規範 Streamable HTTP 的 Backward Compatibility）。
 *
 * 無狀態：不發 `Mcp-Session-Id`，也不提供 GET 串流（回 405），每個 POST 獨立處理。
 *
 * 呼叫者的身分驗證（JWT）由 `api/mcp.ts` 在進來之前完成，這裡只處理協定本身。
 */
import { queryTool } from './mcpQueryService.js'
import { mutateTool } from './mcpMutateService.js'
import { MUTATE_TOOL_NAME, QUERY_TOOL_NAME, TOOL_DEFINITIONS } from './mcpToolDefinitions.js'
import { isRecord, toToolErrorBody } from '../utils/validation.js'

const SERVER_INFO = { name: 'cuter-cat-tiger', version: '0.2.0' }

/** 支援的協定版本，新到舊。 */
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26']

const PARSE_ERROR = -32700
const INVALID_REQUEST = -32600
const METHOD_NOT_FOUND = -32601
const INVALID_PARAMS = -32602

const TOOL_HANDLERS: Record<
  string,
  (db: D1Database, args: Record<string, unknown>) => Promise<unknown>
> = {
  [QUERY_TOOL_NAME]: queryTool,
  [MUTATE_TOOL_NAME]: mutateTool,
}

type JsonRpcId = string | number | null

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: JsonRpcId
  result?: unknown
  error?: { code: number; message: string }
}

function rpcResult(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result }
}

function rpcError(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

/** 工具執行的結果一律放在 text（JSON 字串）；整個呼叫失敗（例如 ops 格式不對）時 isError 為 true。 */
async function callTool(
  db: D1Database,
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: { type: 'text'; text: string }[]; isError: boolean }> {
  try {
    const result = await TOOL_HANDLERS[name](db, args)
    return { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false }
  } catch (err) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: toToolErrorBody(err) }) }],
      isError: true,
    }
  }
}

/** 處理一則 JSON-RPC 訊息；通知（沒有 id）與用戶端送來的回應不需要回覆，回傳 null。 */
async function handleMessage(db: D1Database, message: unknown): Promise<JsonRpcResponse | null> {
  if (!isRecord(message) || message.jsonrpc !== '2.0') {
    return rpcError(null, INVALID_REQUEST, 'Invalid Request')
  }

  // 沒有 method 的是用戶端對伺服器請求的回應；本伺服器不發請求，直接忽略。
  if (typeof message.method !== 'string') {
    return 'id' in message ? null : rpcError(null, INVALID_REQUEST, 'Invalid Request')
  }

  // 通知：沒有 id，不回覆（例如 notifications/initialized）。
  if (!('id' in message)) {
    return null
  }

  const id = message.id
  if (typeof id !== 'string' && typeof id !== 'number') {
    return rpcError(null, INVALID_REQUEST, 'Invalid Request')
  }

  const params = isRecord(message.params) ? message.params : {}

  switch (message.method) {
    case 'initialize': {
      const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : ''
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
        ? requested
        : SUPPORTED_PROTOCOL_VERSIONS[0]
      return rpcResult(id, {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      })
    }
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, { tools: TOOL_DEFINITIONS })
    case 'tools/call': {
      if (typeof params.name !== 'string' || !(params.name in TOOL_HANDLERS)) {
        return rpcError(id, INVALID_PARAMS, `Unknown tool: ${String(params.name)}`)
      }
      const args = isRecord(params.arguments) ? params.arguments : {}
      return rpcResult(id, await callTool(db, params.name, args))
    }
    default:
      return rpcError(id, METHOD_NOT_FOUND, `Method not found: ${message.method}`)
  }
}

/** 處理打到 MCP 端點的 HTTP 請求（呼叫端已通過 JWT 驗證）。 */
export async function handleMcpRequest(request: Request, db: D1Database): Promise<Response> {
  // 無狀態：沒有 GET 串流，也沒有 session 可以用 DELETE 結束。
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  }

  // 帶了本伺服器不支援的版本（例如 2026-07-28）：回 400，內容刻意不是新版的標準錯誤，
  // 讓同時支援新舊版的 client 判定這是舊版伺服器，退回 initialize 流程。
  const headerVersion = request.headers.get('MCP-Protocol-Version')
  if (headerVersion !== null && !SUPPORTED_PROTOCOL_VERSIONS.includes(headerVersion)) {
    return Response.json(
      { error: 'unsupported_protocol_version', supported: SUPPORTED_PROTOCOL_VERSIONS },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(rpcError(null, PARSE_ERROR, 'Parse error'), { status: 400 })
  }

  // 2025-03-26 允許批次（陣列），之後的版本只會送單一訊息，兩種都接受。
  const messages: unknown[] = Array.isArray(body) ? body : [body]
  const isBatch = Array.isArray(body)
  if (messages.length === 0) {
    return Response.json(rpcError(null, INVALID_REQUEST, 'Invalid Request'), { status: 400 })
  }

  const responses: JsonRpcResponse[] = []
  for (const message of messages) {
    const response = await handleMessage(db, message)
    if (response) {
      responses.push(response)
    }
  }

  // 全部都是通知：依規範回 202，沒有 body。
  if (responses.length === 0) {
    return new Response(null, { status: 202 })
  }
  return Response.json(isBatch ? responses : responses[0])
}
