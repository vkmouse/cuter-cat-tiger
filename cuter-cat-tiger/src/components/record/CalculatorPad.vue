<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * 簡化版 CalculatorPad（pending operator 狀態機）：
 * - 只保留加減、AC、0～9，拿掉乘除、小數點、退格、00（記錄的量用不到）
 * - 按運算符號（+ −）進入 pending 狀態，畫面顯示第一個運算元 + 運算符提示
 * - 再輸入第二個數字後，按鍵顯示「=」，只計算並套用結果
 * - 沒有 pending 狀態時，同一顆鍵顯示「確定」
 *   1. 「確定」不是真的送出表單，只是 emit 'collapse' 事件；
 *      三個表單（RecordFeedingSheet／StartFeedingSheet／CompleteFeedingSheet）現在都固定展開計算機、
 *      不再用 ExpandableField 包起來，所以目前呼叫端接到這個事件都是 no-op，
 *      實際存檔仍由外層表單最下方的「儲存」按鈕負責
 *   2. 多加了「結果為負數要擋下來」的規則（cat app 的數量不能是負的）
 */

const props = withDefaults(
  defineProps<{
    modelValue: string
    type: 'water' | 'food'
    unit: string
    saving?: boolean
    // 新增紀錄／開始餵食（給的量）要求必須 > 0；量測「剩下多少」時 0 是合法值，不能套用同一條規則，
    // 由呼叫端依情境決定要不要開啟。
    requirePositive?: boolean
  }>(),
  { saving: false, requirePositive: false },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  // 沒有 pending 運算式時按下「確定」：不是送出表單，只是請外層把計算機摺疊起來
  (e: 'collapse'): void
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

// 跟 JaNote 一樣：pending 狀態下顯示「=」，否則顯示「確定」
const confirmLabel = computed(() => (pendingOperator.value ? '=' : '確定'))
// 跟 JaNote 不同：非 pending 狀態下按這顆鍵只是摺疊起來，不需要「有沒有輸入內容」的限制，
// 因此只要不是 saving 中，任何狀態都可以按。
const confirmEnabled = computed(() => !props.saving)

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
  // 算式已結束：清掉 pending 狀態，讓按鍵變回「確定」，避免卡在「=」誤導使用者以為還能接著算。
  clearPending()
  return true
}

function handleConfirmClick() {
  if (props.saving || !confirmEnabled.value) return

  if (!pendingOperator.value) {
    // 非 pending 狀態：這顆鍵是「確定」，但只負責摺疊，不送出表單
    emit('collapse')
    return
  }

  if (!hasSecondInput.value) {
    // pending 狀態但尚未輸入第二個數字：清除 pending，還原成第一個運算元
    clearPending()
    return
  }

  // pending 狀態且有第二個數字：計算並套用結果
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

interface CalcKey {
  key: string
  kind: 'num' | 'op'
}

// 4 欄 × 3 列：每列前 3 格是數字，第 4 格是該列的功能鍵（AC / + / −，三顆視覺風格統一）。
// 0（佔 3 格）與 =/確定 另外在 template 裡固定放在格線最後一列，不放進這份陣列。
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
    <div class="calc-display">
      <div class="pending-op">{{ pendingOperator ? `${firstOperand} ${pendingOperator}` : '\u00a0' }}</div>
      <div class="calc-value">{{ amount || '0' }}<span class="calc-unit"> {{ unit }}</span></div>
    </div>
    <p v-if="errorMsg" class="calc-error">{{ errorMsg }}</p>
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
        :disabled="saving || !confirmEnabled"
        @click="handleConfirmClick"
      >
        {{ confirmLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.calc-wrap.water { --calc-accent: var(--water); --calc-accent-soft: var(--water-soft); }
.calc-wrap.food { --calc-accent: var(--food); --calc-accent-soft: var(--food-soft); }

/* 整個計算機是「一塊底盤」：display 跟按鍵不再是兩個各自畫框的卡片，
   而是同一個 --paper-dark 底盤裡，數字顯示區用留白＋字重跟按鍵區分，按鍵則用
   微陰影（非邊框）浮起來，像實體計算機的一體成形外殼。 */
.calc-wrap {
  background: var(--paper-dark);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
}

.calc-display {
  padding: var(--space-2) var(--space-2) var(--space-3);
  text-align: right;
}

.pending-op {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--ink-soft);
  min-height: 1em;
}

.calc-value {
  font-family: var(--font-mono);
  font-size: 1.9rem;
  font-weight: 600;
  color: var(--calc-accent);
  line-height: 1.2;
  word-break: break-all;
}

.calc-unit {
  font-size: 0.85rem;
  font-weight: 500;
}

.calc-error {
  margin: 0 0 8px;
  padding: 0 var(--space-2);
  font-size: 0.78rem;
  color: #b3452f;
  text-align: right;
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
  background: var(--card);
  color: var(--ink-soft);
  box-shadow: var(--shadow-raised);
  cursor: not-allowed;
}
</style>
