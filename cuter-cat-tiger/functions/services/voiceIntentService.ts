import * as catRepository from '../repositories/catRepository.js'
import * as feedingSessionRepository from '../repositories/feedingSessionRepository.js'
import type { FeedingSessionWithCatNameRow } from '../repositories/feedingSessionRepository.js'
import { ApiError, parseJsonBody, requireNonEmptyString } from '../utils/validation.js'
import type { Env } from '../types.js'

const OPENROUTER_TIMEOUT_MS = 10_000
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const AI_RETRY_COUNT = 2

type FeedingType = 'water' | 'food'
type VoiceAction = 'start_water' | 'start_food' | 'complete_water' | 'complete_food' | 'unclear'

const START_LABEL: Record<FeedingType, string> = { water: '水', food: '飼料' }
const COMPLETE_LABEL: Record<FeedingType, string> = { water: '喝水', food: '吃飼料' }
const UNIT_FOR_TYPE: Record<FeedingType, string> = { water: 'ml', food: 'g' }

interface VoiceIntentAiOutput {
  action: VoiceAction
  catName?: string | null
  amount?: number | null
  remainingAmount?: number | null
  sessionId?: number | null
}

interface NextRequest {
  method: 'POST'
  path: string
  body: Record<string, unknown>
}

export type VoiceIntentResult =
  | { ok: true; confirmationText: string; nextRequest: NextRequest }
  | { ok: false; reason: string }

function buildPrompt(
  rawText: string,
  cats: { id: number; name: string }[],
  sessions: FeedingSessionWithCatNameRow[],
): string {
  const catList = cats.map((c) => c.name)
  const sessionList = sessions.map((s) => ({
    sessionId: s.id,
    catName: s.cat_name,
    type: s.type,
    givenAmount: s.given_amount,
  }))

  return `你是一個貓咪餵食語音指令解析助手。使用者會說一句中文，內容是四種動作之一：開始餵水、開始餵飼料、完成餵水、完成餵飼料。

請輸出一個 JSON 物件，欄位如下：
- action: "start_water" | "start_food" | "complete_water" | "complete_food" | "unclear"。判斷不出使用者在講什麼時輸出 "unclear"。
- catName: string 或 null。你只能從下面「貓咪清單」中「原樣」選一個名稱，絕對不可以自己發明清單以外的名稱。沒聽到名字就輸出 null。
- amount: number 或 null，只有 action 為 start_* 時提供，代表要給的量。
- remainingAmount: number 或 null，只有 action 為 complete_* 時提供，代表量測到的剩餘量。
- sessionId: number 或 null，只有 action 為 complete_* 時提供，必須是下面「進行中紀錄清單」中某一筆的 sessionId，絕對不可以自行發明。若同一隻貓同類型有多筆，選使用者語意最接近的那一筆；無法判斷就輸出 null。

貓咪清單：
${JSON.stringify(catList)}

進行中紀錄清單：
${JSON.stringify(sessionList)}

只輸出符合上述欄位定義的 JSON 物件，不要有任何其他文字或 Markdown 標記。

使用者原始文字：
"""
${rawText}
"""`
}

async function callOpenRouterOnce(
  prompt: string,
  apiKey: string,
  model: string,
): Promise<VoiceIntentAiOutput> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS)

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API responded with ${response.status}`)
    }

    const data: any = await response.json()
    const text: string | undefined = data?.choices?.[0]?.message?.content
    if (!text) {
      throw new Error('OpenRouter API returned no content')
    }

    return JSON.parse(text) as VoiceIntentAiOutput
  } finally {
    clearTimeout(timeout)
  }
}

function fail(reason: string): VoiceIntentResult {
  return { ok: false, reason }
}

/** 檢查順序沿用規格書表格：action → 貓咪 → 數量(start) → 候選紀錄存在(complete) → 紀錄選擇有效(complete) → 剩餘量(complete) */
function validateIntent(
  intent: VoiceIntentAiOutput,
  cats: { id: number; name: string }[],
  sessions: FeedingSessionWithCatNameRow[],
): VoiceIntentResult {
  if (
    intent.action !== 'start_water' &&
    intent.action !== 'start_food' &&
    intent.action !== 'complete_water' &&
    intent.action !== 'complete_food'
  ) {
    return fail('沒聽懂這句話在說什麼')
  }
  const isStart = intent.action.startsWith('start_')
  const type: FeedingType = intent.action.endsWith('water') ? 'water' : 'food'

  const catName = typeof intent.catName === 'string' ? intent.catName.trim() : ''
  if (!catName) {
    return fail('沒聽到明確的貓咪名字')
  }
  const cat = cats.find((c) => c.name === catName)
  if (!cat) {
    return fail('貓咪名字對不到任何一隻貓')
  }

  if (isStart) {
    const amount = intent.amount
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return fail('沒聽到明確的數量')
    }

    const unit = UNIT_FOR_TYPE[type]
    return {
      ok: true,
      confirmationText: `要幫 ${cat.name} 開始餵${START_LABEL[type]}，量是 ${amount} ${unit}，對嗎？`,
      nextRequest: {
        method: 'POST',
        path: '/api/feeding-sessions',
        body: { catId: cat.id, type, amount, unit },
      },
    }
  }

  const candidateSessions = sessions.filter((s) => s.cat_id === cat.id && s.type === type)
  if (candidateSessions.length === 0) {
    return fail(`沒有進行中的${COMPLETE_LABEL[type]}紀錄可以完成`)
  }

  const sessionId = intent.sessionId
  const session = candidateSessions.find((s) => s.id === sessionId)
  if (!session) {
    return fail('選到的紀錄不在候選清單中')
  }

  const remainingAmount = intent.remainingAmount
  if (typeof remainingAmount !== 'number' || !Number.isFinite(remainingAmount) || remainingAmount < 0) {
    return fail('沒聽到明確的剩餘量')
  }

  return {
    ok: true,
    confirmationText: `要幫 ${cat.name} 完成${COMPLETE_LABEL[type]}紀錄，剩下 ${remainingAmount} ${session.unit}，對嗎？`,
    nextRequest: {
      method: 'POST',
      path: `/api/feeding-sessions/${session.id}/complete`,
      body: { remainingAmount },
    },
  }
}

/**
 * 呼叫 AI 並檢核結果；不論是逾時／呼叫失敗，或是檢核失敗，都重新呼叫 AI，
 * 最多重試 AI_RETRY_COUNT 次（總呼叫次數為 1 + AI_RETRY_COUNT）。
 * 重試次數用盡後，若是呼叫失敗則拋出 ApiError，若是檢核失敗則回傳最後一次的失敗結果。
 */
async function resolveIntentWithRetry(
  prompt: string,
  env: Env,
  cats: { id: number; name: string }[],
  sessions: FeedingSessionWithCatNameRow[],
): Promise<VoiceIntentResult> {
  if (!env.OPENROUTER_API_KEY || !env.OPENROUTER_MODEL) {
    throw new ApiError(500, 'OPENROUTER_API_KEY / OPENROUTER_MODEL 未設定')
  }

  let lastValidationFailure: VoiceIntentResult | null = null

  for (let attempt = 0; attempt <= AI_RETRY_COUNT; attempt++) {
    const isLastAttempt = attempt === AI_RETRY_COUNT

    let intent: VoiceIntentAiOutput
    try {
      intent = await callOpenRouterOnce(prompt, env.OPENROUTER_API_KEY, env.OPENROUTER_MODEL)
    } catch (err) {
      if (isLastAttempt) {
        throw new ApiError(502, `AI 服務呼叫失敗：${err instanceof Error ? err.message : String(err)}`)
      }
      continue
    }

    const result = validateIntent(intent, cats, sessions)
    if (result.ok) {
      return result
    }

    lastValidationFailure = result
    if (isLastAttempt) {
      return result
    }
  }

  // 理論上不會走到這裡（迴圈內一定會 return 或 throw），保留作為型別安全的保底。
  return lastValidationFailure ?? fail('沒聽懂這句話在說什麼')
}

export async function resolveVoiceIntent(env: Env, request: Request): Promise<VoiceIntentResult> {
  const db = env.DB
  const body = await parseJsonBody(request)
  const rawText = requireNonEmptyString(body.rawText, 'rawText')

  const cats = await catRepository.listCats(db)
  const sessions = await feedingSessionRepository.listAllFeedingSessions(db)

  return resolveIntentWithRetry(buildPrompt(rawText, cats, sessions), env, cats, sessions)
}
