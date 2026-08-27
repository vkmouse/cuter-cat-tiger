<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * 「輸入工作區」整塊面板：原本的 CalculatorPad（純鍵盤）+ AmountNoteBar（數量＋備註）+
 * 快速備註 pill 列，現在都收在同一個 --paper-dark 底盤裡，對齊參考圖「日期 → 數量/備註 →
 * 快速備註 → 鍵盤」是同一個視覺群組的方向。AmountNoteBar 已經沒有獨立存在的理由（拿掉圖示後
 * 只剩下純粹的一列，且只有這裡會用到）所以直接併進來，不再是獨立元件。
 *
 * pending operator 狀態機（沿用）：
 * - 只保留加減、AC、0～9，拿掉乘除、小數點、退格、00（記錄的量用不到）
 * - 按運算符號（+ −）進入 pending 狀態，該運算符鍵會亮起（operator-active）當作唯一提示，
 *   不再額外顯示「第一個運算元 + 運算符」的一行小字——使用者只在乎最後的結果。
 * - 這顆鍵固定顯示「=」文字，不因狀態切換文案；只有 enabled/disabled 兩種狀態的差別：
 *   只要不是「有算式、且已經輸入第二個數字」的狀態，一律 disabled——按 10（還沒有運算子）
 *   disabled；按 10 + （還沒有第二個數字）也 disabled；10 + 1 才 enabled。
 * - 結果為負數要擋下來（cat app 的數量不能是負的）
 *
 * given-amount / datetime slot：兩者都只負責「呈現」，狀態與互動邏輯留在外層 Sheet，
 * 不傳就完全不顯示那個區塊（例如 StartFeedingSheet 沒有時間、Record/Start 都沒有已給量）。
 */

const props = withDefaults(
  defineProps<{
    modelValue: string
    note: string
    type: 'water' | 'food'
    unit: string
    saving?: boolean
    quickNotes?: string[]
    notePlaceholder?: string
    // 新增紀錄／開始餵食（給的量）要求必須 > 0；量測「剩下多少」時 0 是合法值，不能套用同一條規則，
    // 由呼叫端依情境決定要不要開啟。
    requirePositive?: boolean
  }>(),
  { saving: false, requirePositive: false, quickNotes: () => [], notePlaceholder: '在此輸入備註' },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:note', value: string): void
}>()

const amount = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const pendingOperator = ref<string | null>(null)
const firstOperand = ref('')
const hasSecondInput = ref(false)
const errorMsg = ref('')

// 表單從外部重置數量（例如切換新增/編輯、換一種類型）時，計算機自己的暫存狀態也要一併清掉，
// 否則會殘留上一次沒按完的運算符號。
watch(
  () => props.modelValue,
  (val, oldVal) => {
    if (val === '' && oldVal !== '') {
      clearPending()
      errorMsg.value = ''
    }
  },
)

// 這顆鍵固定顯示「=」，唯有存在「運算子 + 已輸入第二個數字」的完整算式時才能按，
// 其餘情況（沒有運算子；有運算子但還沒輸入第二個數字）一律 disabled。
const confirmEnabled = computed(() => !!pendingOperator.value && hasSecondInput.value && !props.saving)

function clearPending() {
  pendingOperator.value = null
  firstOperand.value = ''
  hasSecondInput.value = false
}

function calculate(a: string, op: string, b: string): number | null {
  const numA = parseFloat(a)
  const numB = parseFloat(b)
  if (Number.isNaN(numA) || Number.isNaN(numB)) return null
  if (op === '+') return numA + numB
  if (op === '−') return numA - numB
  return null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** 計算並套用結果；失敗或結果為負數時回傳 false，不套用。 */
function applyCalculation(): boolean {
  const result = calculate(firstOperand.value, pendingOperator.value as string, amount.value)
  if (result === null) {
    errorMsg.value = '算式有誤，請確認後重新輸入'
    clearPending()
    return false
  }
  if (result < 0) {
    // 定案規則：數量不能是負的，擋下來並還原成運算前的數字。
    errorMsg.value = '計算結果為負數，請確認數字後重新輸入'
    amount.value = firstOperand.value
    clearPending()
    return false
  }
  errorMsg.value = ''
  amount.value = String(round2(result))
  // 算式已結束：清掉 pending 狀態，讓按鍵變回 disabled，避免卡在可按的「=」誤導使用者以為還能接著算。
  clearPending()
  return true
}

function handleConfirmClick() {
  // disabled 狀態下不會走到這裡；保留這個檢查只是防呆。
  if (!confirmEnabled.value) return
  applyCalculation()
}

function handleKey(key: string) {
  if (props.saving) return
  errorMsg.value = ''

  if (key === 'AC') {
    amount.value = '0'
    clearPending()
    return
  }

  if (key === '+' || key === '−') {
    if (pendingOperator.value) {
      if (hasSecondInput.value) {
        const result = calculate(firstOperand.value, pendingOperator.value, amount.value)
        if (result === null) {
          errorMsg.value = '算式有誤，請確認後重新輸入'
          clearPending()
          return
        }
        if (result < 0) {
          errorMsg.value = '計算結果為負數，請確認數字後重新輸入'
          amount.value = firstOperand.value
          clearPending()
          return
        }
        const resultStr = String(round2(result))
        amount.value = resultStr
        firstOperand.value = resultStr
        pendingOperator.value = key
        hasSecondInput.value = false
      } else {
        pendingOperator.value = key
      }
    } else if (amount.value) {
      firstOperand.value = amount.value
      pendingOperator.value = key
      hasSecondInput.value = false
    }
    return
  }

  // 數字鍵（0～9）
  if (pendingOperator.value && !hasSecondInput.value) {
    amount.value = key
    hasSecondInput.value = true
    return
  }
  // 目前顯示是 '0' 時（開機預設值，或 AC 清除後），下一個數字鍵要直接取代，
  // 否則會變成 '05' 這種帶多餘前導零的怪異結果。
  amount.value = amount.value === '0' ? key : amount.value + key
}

function handleNoteInput(e: Event) {
  emit('update:note', (e.target as HTMLInputElement).value)
}

function selectQuickNote(text: string) {
  // 定案：快速備註是「取代」，不是「附加」。
  emit('update:note', text)
}

interface CalcKey {
  key: string
  kind: 'num' | 'op'
}

// 4 欄 × 3 列：每列前 3 格是數字，第 4 格是該列的功能鍵（AC / + / −，三顆視覺風格統一）。
// 0（佔 3 格）與 = 另外在 template 裡固定放在格線最後一列，不放進這份陣列。
const GRID_KEYS: CalcKey[] = [
  { key: '7', kind: 'num' }, { key: '8', kind: 'num' }, { key: '9', kind: 'num' }, { key: 'AC', kind: 'op' },
  { key: '4', kind: 'num' }, { key: '5', kind: 'num' }, { key: '6', kind: 'num' }, { key: '+', kind: 'op' },
  { key: '1', kind: 'num' }, { key: '2', kind: 'num' }, { key: '3', kind: 'num' }, { key: '−', kind: 'op' },
]

function handleKeyClick(key: string) {
  handleKey(key)
}
</script>

<template>
  <div class="calc-wrap" :class="type">
    <div v-if="$slots['given-amount']" class="calc-given-amount">
      <slot name="given-amount" />
    </div>

    <div v-if="$slots.datetime" class="calc-datetime">
      <slot name="datetime" />
    </div>

    <div class="calc-amount-note">
      <span class="calc-amount-value">
        <span class="calc-amount-number">{{ amount || '0' }}</span><span class="calc-amount-unit">{{ unit }}</span>
      </span>
      <span class="calc-amount-divider" aria-hidden="true"></span>
      <input
        class="calc-note-input"
        type="text"
        :value="note"
        :placeholder="notePlaceholder"
        aria-label="備註"
        @input="handleNoteInput"
      />
    </div>

    <p v-if="errorMsg" class="calc-error">{{ errorMsg }}</p>

    <div v-if="quickNotes.length" class="pill-group calc-quick-notes on-panel" :class="{ food: type === 'food' }">
      <button
        v-for="text in quickNotes"
        :key="text"
        type="button"
        class="pill"
        :class="{ active: note === text }"
        @click="selectQuickNote(text)"
      >
        {{ text }}
      </button>
    </div>

    <div class="calc-keys">
      <button
        v-for="k in GRID_KEYS"
        :key="k.key"
        type="button"
        class="calc-btn"
        :class="k.kind === 'num' ? 'number-btn' : ['function-btn', { 'operator-active': pendingOperator === k.key }]"
        :disabled="saving"
        @click="handleKeyClick(k.key)"
      >
        {{ k.key }}
      </button>
      <button
        type="button"
        class="calc-btn number-btn zero-btn"
        :disabled="saving"
        @click="handleKey('0')"
      >
        0
      </button>
      <button
        type="button"
        class="calc-btn confirm-btn"
        :disabled="!confirmEnabled"
        @click="handleConfirmClick"
      >
        =
      </button>
    </div>
  </div>
</template>

<style scoped>
.calc-wrap.water { --calc-accent: var(--water); --calc-accent-soft: var(--water-soft); }
.calc-wrap.food { --calc-accent: var(--food); --calc-accent-soft: var(--food-soft); }

/* 整個「輸入工作區」是一塊底盤：日期、數量/備註、快速備註、鍵盤全部在同一個 --paper-dark
   面板裡，用留白＋卡片/pill 的深淺區分彼此，而不是各自獨立的區塊。 */
.calc-wrap {
  background: var(--paper-dark);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
}

/* 已給量：純呈現用的一行文字（label + value），只有 CompleteFeedingSheet 會傳這個 slot 進來。 */
.calc-given-amount {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  padding: 0 2px;
  font-size: 0.85rem;
}

.calc-given-amount :deep(.given-amount-label) {
  color: var(--ink-soft);
}

.calc-given-amount :deep(.given-amount-value) {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--ink);
}

/* 日期時間 pill：這裡只提供「一塊白色圓角列」的外觀，內容（DateTimePicker）由外層 Sheet
   透過 slot 傳進來，展開/收合等互動邏輯完全在 DateTimePicker／ExpandableField 裡，
   這裡只用 :deep() 覆寫視覺，讓它在深色底盤上呈現白色 pill。 */
.calc-datetime {
  margin-bottom: var(--space-3);
}

.calc-datetime :deep(.expandable-field) {
  background: var(--card);
  border-radius: var(--radius-pill);
}

.calc-datetime :deep(.expandable-field.expanded) {
  background: var(--card);
  border-radius: var(--radius-md);
}

.calc-datetime :deep(.expandable-summary) {
  padding: 13px 18px;
  font-weight: 600;
}

.calc-datetime :deep(.expandable-body) {
  background: var(--paper);
}

/* 數量＋備註：白色圓角列，取代原本各自的「數量」「備註」兩個 field。
   數量本身不可編輯（純顯示，實際輸入交給下方鍵盤），備註是可輸入的 input。
   拿掉圖示：Sheet 標題與上方 toggle 已經表達了水/飼料，這裡不用再放一次。 */
.calc-amount-note {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--card);
  box-shadow: var(--shadow-raised-active);
}

.calc-amount-value {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 1rem;
  color: var(--ink);
}

/* 預留 4 位數字的寬度（cat app 的量測範圍內夠用），輸入短數字時就不會整個貼著左邊，
   跟旁邊的分隔線/備註欄保持固定的相對位置。 */
.calc-amount-number {
  min-width: 4ch;
  text-align: left;
}

/* 固定寬度的 unit 欄位：不論顯示 'ml' 還是 'g'，後面的分隔線／備註起始位置都要對齊在同一個地方，
   不能因為字元數不同而讓整排跟著跳動。 */
.calc-amount-unit {
  display: inline-block;
  min-width: 2.2ch;
  margin-left: 3px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--ink-soft);
}

.calc-amount-divider {
  width: 1px;
  align-self: stretch;
  background: var(--line);
  flex-shrink: 0;
}

.calc-note-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--ink);
  padding: 0;
}

.calc-note-input::placeholder {
  color: var(--ink-soft);
}

.calc-note-input:focus {
  outline: none;
}

.calc-error {
  margin: 0 0 8px;
  padding: 0 2px;
  font-size: 0.78rem;
  color: #b3452f;
  text-align: right;
}

/* 快速備註現在放進計算機底盤裡，pill 預設底色（--paper-dark）跟底盤同色會糊在一起，
   所以套用共用的 .on-panel（見 base.css）把未選取狀態覆寫成跟數字鍵一樣的白色，
   靠深淺差異跟底盤區分；.active 狀態的底色/白字完全交給 .pill.active 系列規則，
   這裡絕不能碰，否則白字會疊在白底上看不到。 */
.calc-quick-notes {
  margin-bottom: var(--space-3);
}

/* 4 欄 grid：3x3 數字 + 每列一顆功能鍵，最後一列 0（佔 3 格）+ =/確定 */
.calc-keys {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
}

.zero-btn {
  grid-column: span 3;
}

.calc-btn {
  padding: 15px 0;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
  background: var(--card);
  box-shadow: var(--shadow-raised);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.calc-btn:active {
  transform: scale(0.96);
  box-shadow: var(--shadow-raised-active);
}

.calc-btn.function-btn {
  background: var(--calc-accent-soft);
  color: var(--calc-accent);
  box-shadow: none;
}

.calc-btn.function-btn.operator-active {
  background: var(--calc-accent);
  color: #fff;
}

.calc-btn.number-btn {
  font-family: var(--font-mono);
  font-size: 1.05rem;
}

.calc-btn.confirm-btn {
  width: 100%;
  background: var(--calc-accent);
  color: #fff;
  box-shadow: none;
  padding: 15px 0;
}

.calc-btn.confirm-btn:disabled {
  background: var(--calc-accent-soft);
  color: var(--calc-accent);
  opacity: 0.55;
  box-shadow: none;
  cursor: not-allowed;
}
</style>
