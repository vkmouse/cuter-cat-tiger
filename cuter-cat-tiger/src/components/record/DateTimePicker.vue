<script setup lang="ts">
/**
 * 日曆＋時間選擇器，取代原本單純的 <input type="datetime-local">。
 * 日曆網格互動參考 JaNote 的 CalendarPicker（月份翻頁、選日期、今日/現在快速鍵），
 * 但這裡不是全螢幕 modal，而是用 ExpandableField 包成「點一下展開、點一下摺疊」的內嵌欄位，
 * 好跟 RecordFeedingSheet 裡的 CalculatorPad 維持一致的收合互動。
 *
 * modelValue 沿用 utils/date.ts 的 datetime-local 字串格式（'YYYY-MM-DDTHH:mm'，UTC+8 的牆上時鐘時間，
 * 不帶時區資訊），跟原本 RecordFormSheet（現拆為 RecordFeedingSheet/RecordLitterFormSheet）內部 timeValue 的格式完全一致，呼叫端不需要額外轉換。
 */
import { computed, ref, watch } from 'vue'
import { WEEKDAY_LABELS, weekdayLabel, nowDateTimeLocalValue, todayDateKey } from '../../utils/date'
import ExpandableField from '../ui/ExpandableField.vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const expanded = ref(false)

function splitValue(value: string): { dateKey: string; time: string } {
  const v = value || nowDateTimeLocalValue()
  const [dateKey, time] = v.split('T')
  return { dateKey: dateKey ?? '', time: time ?? '00:00' }
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function buildDateKey(year: number, monthZeroIndexed: number, day: number): string {
  return `${year}-${pad2(monthZeroIndexed + 1)}-${pad2(day)}`
}

function daysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(Date.UTC(year, monthZeroIndexed + 1, 0)).getUTCDate()
}

// 0 = 星期日，跟 WEEKDAY_LABELS 的順序一致，不需要像 Monday-first 曆法那樣做偏移。
function firstWeekdayOfMonth(year: number, monthZeroIndexed: number): number {
  return new Date(Date.UTC(year, monthZeroIndexed, 1)).getUTCDay()
}

const initial = splitValue(props.modelValue)
const [initYear, initMonth] = initial.dateKey.split('-').map(Number)
// 日曆目前瀏覽的年月，跟實際選取的日期分開存放，翻頁看別的月份不會動到已選的值。
const viewYear = ref(initYear!)
const viewMonth = ref(initMonth! - 1)

// modelValue 從外部被重置時（例如切換新增/編輯），日曆檢視要跟著跳回該月份。
watch(
  () => props.modelValue,
  (v) => {
    const { dateKey } = splitValue(v)
    const [y, m] = dateKey.split('-').map(Number)
    if (y && m) {
      viewYear.value = y
      viewMonth.value = m - 1
    }
  },
)

const selectedDateKey = computed(() => splitValue(props.modelValue).dateKey)
const timeValue = computed(() => splitValue(props.modelValue).time)
const todayKey = computed(() => todayDateKey())

interface CalendarDay {
  day: number
  dateKey: string
  isCurrentMonth: boolean
}

const calendarDays = computed<CalendarDay[]>(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const days: CalendarDay[] = []

  const leading = firstWeekdayOfMonth(y, m)
  const prevMonth = m === 0 ? 11 : m - 1
  const prevYear = m === 0 ? y - 1 : y
  const prevMonthDays = daysInMonth(prevYear, prevMonth)
  for (let i = leading - 1; i >= 0; i--) {
    const day = prevMonthDays - i
    days.push({ day, dateKey: buildDateKey(prevYear, prevMonth, day), isCurrentMonth: false })
  }

  const total = daysInMonth(y, m)
  for (let day = 1; day <= total; day++) {
    days.push({ day, dateKey: buildDateKey(y, m, day), isCurrentMonth: true })
  }

  // 只補齊當月實際需要的週數，不固定塞滿 6 週，避免手機上無謂增加高度。
  const nextMonth = m === 11 ? 0 : m + 1
  const nextYear = m === 11 ? y + 1 : y
  const weekCount = Math.ceil(days.length / 7)
  const remaining = weekCount * 7 - days.length
  for (let day = 1; day <= remaining; day++) {
    days.push({ day, dateKey: buildDateKey(nextYear, nextMonth, day), isCurrentMonth: false })
  }

  return days
})

const viewMonthLabel = computed(() => `${viewYear.value} 年 ${viewMonth.value + 1} 月`)

function isSelected(dateKey: string): boolean {
  return dateKey === selectedDateKey.value
}
function isToday(dateKey: string): boolean {
  return dateKey === todayKey.value
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}
function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}

function selectDay(day: CalendarDay) {
  emit('update:modelValue', `${day.dateKey}T${timeValue.value}`)
  if (!day.isCurrentMonth) {
    const [y, m] = day.dateKey.split('-').map(Number)
    viewYear.value = y!
    viewMonth.value = m! - 1
  }
}

function selectNow() {
  const { dateKey, time } = splitValue(nowDateTimeLocalValue())
  emit('update:modelValue', `${dateKey}T${time}`)
  const [y, m] = dateKey.split('-').map(Number)
  viewYear.value = y!
  viewMonth.value = m! - 1
}

function handleTimeInput(e: Event) {
  const time = (e.target as HTMLInputElement).value || '00:00'
  emit('update:modelValue', `${selectedDateKey.value}T${time}`)
}

const summaryLabel = computed(() => {
  const [y, m, d] = selectedDateKey.value.split('-').map(Number)
  if (!y) return '選擇時間'
  return `${y}/${pad2(m!)}/${pad2(d!)} ${weekdayLabel(selectedDateKey.value)} ${timeValue.value}`
})
</script>

<template>
  <ExpandableField v-model:expanded="expanded">
    <template #summary>
      <span class="datetime-summary">{{ summaryLabel }}</span>
    </template>

    <div class="calendar-nav">
      <button type="button" class="nav-arrow" aria-label="上個月" @click="prevMonth">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 9 12 15 18" /></svg>
      </button>
      <span class="calendar-title">{{ viewMonthLabel }}</span>
      <button type="button" class="nav-arrow" aria-label="下個月" @click="nextMonth">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
      </button>
      <button type="button" class="now-btn" @click="selectNow">現在</button>
    </div>

    <div class="calendar-weekdays">
      <div v-for="label in WEEKDAY_LABELS" :key="label" class="weekday">{{ label }}</div>
    </div>

    <div class="calendar-grid">
      <button
        v-for="day in calendarDays"
        :key="day.dateKey"
        type="button"
        class="calendar-day"
        :class="{ 'other-month': !day.isCurrentMonth, selected: isSelected(day.dateKey), today: isToday(day.dateKey) }"
        @click="selectDay(day)"
      >
        {{ day.day }}
      </button>
    </div>

    <div class="time-row">
      <label for="fCalendarTime">時間</label>
      <input id="fCalendarTime" type="time" :value="timeValue" @input="handleTimeInput" />
    </div>
  </ExpandableField>
</template>

<style scoped>
.datetime-summary {
  font-weight: 600;
  font-size: 0.92rem;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.calendar-title {
  flex: 1;
  text-align: center;
  font-weight: 600;
  font-size: 0.88rem;
}

.nav-arrow {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-soft);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.nav-arrow:hover {
  background: var(--paper-dark);
}

.now-btn {
  background: var(--paper-dark);
  border: none;
  border-radius: var(--radius-pill);
  padding: 6px 12px;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
}

.now-btn:hover {
  background: var(--water-soft);
  color: var(--water);
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 4px;
}

.weekday {
  text-align: center;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--ink-soft);
  padding: 4px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 12px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: none;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--ink);
  transition: background 0.15s ease, color 0.15s ease;
}

.calendar-day.other-month {
  color: var(--ink-soft);
  opacity: 0.5;
}

.calendar-day.today {
  background: var(--paper-dark);
  font-weight: 700;
}

.calendar-day.selected {
  background: var(--ink);
  color: #fff;
  font-weight: 700;
}

.time-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-row label {
  font-size: 0.82rem;
  color: var(--ink-soft);
}

.time-row input[type='time'] {
  flex: 1;
  border: none;
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  font-family: var(--font-mono);
  font-size: 0.92rem;
  color: var(--ink);
  background: var(--card);
  box-shadow: var(--shadow-raised-active);
  -webkit-appearance: none;
  appearance: none;
}
</style>
