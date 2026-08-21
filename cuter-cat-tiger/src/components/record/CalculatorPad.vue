<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * 仿照 JaNote CalculatorPad 的互動邏輯（pending operator 狀態機）：
 * - 按運算符號（+ − × ÷）進入 pending 狀態，畫面顯示第一個運算元 + 運算符提示
 * - 再輸入第二個數字後，按鍵顯示「=」，只計算並套用結果
 * - 沒有 pending 狀態時，同一顆鍵顯示「確定」——這點跟 JaNote 一樣是同一顆按鍵
 * - 跟 JaNote 不同的地方：
 *   1. 「確定」不是真的送出表單，只是把外層 ExpandableField 摺疊起來（emit 'collapse'），
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
  if (op === '×') return numA * numB
  if (op === '÷') return numB === 0 ? null : numA / numB
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
    amount.value = ''
    clearPending()
    return
  }

  if (key === '←') {
    if (pendingOperator.value) {
      amount.value = firstOperand.value
      clearPending()
    } else {
      amount.value = amount.value.slice(0, -1)
    }
    return
  }

  if (key === '+' || key === '−' || key === '×' || key === '÷') {
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

  if (key === '.') {
    if (pendingOperator.value && !hasSecondInput.value) {
      amount.value = '0.'
      hasSecondInput.value = true
      return
    }
    if (!amount.value.includes('.')) amount.value += key
    return
  }

  // 數字鍵（含 00）
  if (pendingOperator.value && !hasSecondInput.value) {
    amount.value = key === '00' ? '0' : key
    hasSecondInput.value = true
    return
  }
  amount.value += key
}

interface CalcKey {
  key: string
  kind: 'num' | 'op' | 'fn' | 'confirm'
}

const KEYS: CalcKey[] = [
  { key: '7', kind: 'num' }, { key: '8', kind: 'num' }, { key: '9', kind: 'num' }, { key: '÷', kind: 'op' }, { key: 'AC', kind: 'fn' },
  { key: '4', kind: 'num' }, { key: '5', kind: 'num' }, { key: '6', kind: 'num' }, { key: '×', kind: 'op' }, { key: '←', kind: 'fn' },
  { key: '1', kind: 'num' }, { key: '2', kind: 'num' }, { key: '3', kind: 'num' }, { key: '+', kind: 'op' }, { key: '確定', kind: 'confirm' },
  { key: '00', kind: 'num' }, { key: '0', kind: 'num' }, { key: '.', kind: 'num' }, { key: '−', kind: 'op' },
]

function keyLabel(k: CalcKey) {
  return k.kind === 'confirm' ? confirmLabel.value : k.key
}

function handleKeyClick(k: CalcKey) {
  if (k.kind === 'confirm') {
    handleConfirmClick()
  } else {
    handleKey(k.key)
  }
}
</script>

<template>
  <div class="calc-wrap" :class="type">
    <div class="calc-display">
      <div class="pending-op">{{ pendingOperator ? `${firstOperand} ${pendingOperator}` : '\u00a0' }}</div>
      <div class="calc-value">{{ amount || '0' }}<span class="calc-unit"> {{ unit }}</span></div>
    </div>
    <p v-if="errorMsg" class="calc-error">{{ errorMsg }}</p>
    <div class="calc-grid">
      <button
        v-for="k in KEYS"
        :key="k.key"
        type="button"
        class="calc-btn"
        :class="[
          k.kind === 'num' ? 'number-btn' : '',
          k.kind === 'op' ? 'function-btn' : '',
          k.kind === 'fn' ? 'function-btn' : '',
          k.kind === 'confirm' ? 'confirm-btn' : '',
          { 'operator-active': k.kind === 'op' && pendingOperator === k.key },
        ]"
        :disabled="saving || (k.kind === 'confirm' && !confirmEnabled)"
        @click="handleKeyClick(k)"
      >
        {{ keyLabel(k) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.calc-wrap.water { --calc-accent: var(--water); --calc-accent-soft: var(--water-soft); }
.calc-wrap.food { --calc-accent: var(--food); --calc-accent-soft: var(--food-soft); }

.calc-display {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 6px;
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
  font-size: 1.6rem;
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
  margin: 0 0 6px;
  font-size: 0.78rem;
  color: #b3452f;
}

.calc-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.calc-btn {
  padding: 13px 0;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
  background: var(--card);
  transition: transform 0.1s ease;
}

.calc-btn:active {
  transform: scale(0.95);
}

.calc-btn.function-btn {
  background: var(--calc-accent-soft);
  color: var(--calc-accent);
  border-color: var(--calc-accent-soft);
}

.calc-btn.function-btn.operator-active {
  background: var(--calc-accent);
  color: #fff;
}

.calc-btn.confirm-btn {
  background: var(--calc-accent);
  color: #fff;
  border-color: var(--calc-accent);
  grid-row: span 2;
  padding: 0;
}

.calc-btn.confirm-btn:disabled {
  background: var(--paper-dark);
  color: var(--ink-soft);
  border-color: var(--line);
  cursor: not-allowed;
}
</style>
