/**
 * MCP 工具的名稱、說明與輸入格式。description 是給呼叫端的 AI 讀的，
 * 規則要寫清楚，AI 才會照著用（見 MCP 規格書第 4 節）。
 */

export const QUERY_TOOL_NAME = 'query'
export const MUTATE_TOOL_NAME = 'mutate'

const QUERY_DESCRIPTION = `唯讀。一次回傳現在時間、貓咪、進行中餵食、每日統計、排泄最近時間與提醒，不會改變任何資料。

使用規則：
- 對話開始先呼叫一次，取得貓咪清單與進行中餵食（pending）。之後直接用 mutate 回傳的 state，不必重查。
- 時間都是台灣時間（UTC+8），輸出帶 +08:00。
- 回傳欄位：now、cats（每日目標）、pending（進行中餵食，含 id）、daily（範圍內每隻貓每天一列：飲水 ml、進食 g、尿尿與便便次數）、summary（最近一次尿尿與便便的時間）、alerts（提醒）。
- 想看每一筆紀錄（含 id，修改或刪除前需要）才加 include: ["records"]，最多 500 筆。
- date 是統計範圍的最後一天，days 是往前幾天（含 date）；pending、summary、alerts 與它們無關，永遠是現在的狀況。
- 貓名對不到時會回 CAT_NOT_FOUND 與可用的貓名；請詢問使用者，不可猜。`

const MUTATE_DESCRIPTION = `寫入。一次接收多個動作（ops），依序執行，每個動作各自回報成敗，並回傳受影響貓咪最新的 pending 與今天的統計（state）。

動作（op）：
- start：開始餵食（先給後量）。必填 cat、type（water 或 food）、amount；選填 note、時間。
- complete：完成餵食，結案後寫入紀錄。用 id 指定，或不給 id 改給 cat + type（該貓該類型剛好一筆進行中才會成功，有多筆會回 SESSION_AMBIGUOUS）。remaining 與 consumed 擇一；選填 note、時間。
- record：直接記錄一筆（不經過 start）。必填 cat、type（water、food、pee、poop）；water、food 要 amount；pee、poop 不可帶 amount。選填 note、時間。
- update：修改。必填 target（record 或 session）、id，以及至少一個要改的欄位（amount、note、時間）。不能改貓咪與類型，要改就 delete 後重建。
- delete：永久刪除，不可復原。必填 target、id。

規則：
- 單位固定：water 是 ml，food 是 g；不用也不能指定單位。
- 備註：food 只能是 飼料、罐頭、化毛膏、濕食；water 只能是 水、罐頭加水、濕食加水。start 與 record 時主動帶備註，沒帶才用預設（飼料、水）。備註是化毛膏且沒給 amount 時預設 1 g。pee、poop 的備註是自由文字（最多 200 字），選填。
- 使用者說「吃了多少」或「喝了多少」用 consumed；說「剩多少」用 remaining。
- start（先給後量，之後還要 complete）與 record（直接記錄實際吃掉的量）語意不同；不確定是哪一種時先問使用者。
- 同一隻貓同類型有多筆進行中時，必須詢問使用者是哪一筆，再用 id，不可猜。
- 貓名對不到時詢問使用者，不可新增或猜測。
- 補登時間用 minutesAgo（從現在往前幾分鐘，0 到 43200）或 at（台灣時間，例如 2026-11-14T15:20；帶 Z 或 +hh:mm 才會當成該時區），兩者擇一，不要自己換算成 UTC。沒給時間就是現在。
- 所有動作放在同一次呼叫；多隻貓套用同一個量時，展開成多個 op。同一次呼叫不能 start 之後立刻 complete 同一筆（拿不到 id），但可以對已存在的進行中餵食用 cat + type 完成。
- 以 results 的成敗回報；失敗的動作要告訴使用者，不要重送已成功的動作（沒有防重複，重送會多一筆）。
- update 與 delete 只在使用者明確要求時使用。`

export const TOOL_DEFINITIONS = [
  {
    name: QUERY_TOOL_NAME,
    description: QUERY_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: '統計範圍的最後一天，格式 YYYY-MM-DD（台灣日期）；預設今天，不能晚於今天。',
        },
        days: {
          type: 'integer',
          minimum: 1,
          maximum: 31,
          description: '統計往前幾天（含 date），預設 1。',
        },
        cat: { type: 'string', description: '只看這隻貓（貓名）；預設全部。' },
        include: {
          type: 'array',
          items: { type: 'string', enum: ['records'] },
          description: '加上 "records" 會多回範圍內的紀錄明細（含 id）。',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: MUTATE_TOOL_NAME,
    description: MUTATE_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        ops: {
          type: 'array',
          minItems: 1,
          maxItems: 50,
          description: '要依序執行的動作，1 到 50 筆。',
          items: {
            type: 'object',
            properties: {
              op: { type: 'string', enum: ['start', 'complete', 'record', 'update', 'delete'] },
              cat: { type: 'string', description: '貓名；start、record 必填，complete 沒給 id 時必填。' },
              type: {
                type: 'string',
                enum: ['water', 'food', 'pee', 'poop'],
                description: 'start 與 complete（沒給 id 時）只能 water 或 food。',
              },
              amount: {
                type: 'number',
                description:
                  'water 為 ml、food 為 g。start、record 是量（大於 0）；update 是新的量；pee、poop 不可帶。',
              },
              note: {
                type: 'string',
                description: '備註（品項分類），可用值見工具說明；pee、poop 為自由文字。',
              },
              id: { type: 'integer', description: 'session 或 record 的 id。' },
              remaining: { type: 'number', description: 'complete：量到的剩餘量（0 以上）。' },
              consumed: { type: 'number', description: 'complete：實際吃或喝掉的量。' },
              target: {
                type: 'string',
                enum: ['record', 'session'],
                description: 'update、delete：要改或刪的是紀錄還是進行中餵食。',
              },
              at: { type: 'string', description: '絕對時間（台灣時間），與 minutesAgo 擇一。' },
              minutesAgo: {
                type: 'integer',
                minimum: 0,
                maximum: 43200,
                description: '從現在往前推幾分鐘，與 at 擇一。',
              },
            },
            required: ['op'],
          },
        },
      },
      required: ['ops'],
      additionalProperties: false,
    },
  },
]
