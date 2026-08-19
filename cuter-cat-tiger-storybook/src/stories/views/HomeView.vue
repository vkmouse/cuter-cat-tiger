<script setup lang="ts">
// Storybook 專用檔案，不屬於正式 app 程式碼，只是刻意跟原始碼同名放在對應的
// views/ 資料夾下，方便對照：這裡示範的是 cuter-cat-tiger/src/views/HomeView.vue。
// 目的：把 components/ 底下所有元件組裝成跟正式版一樣的畫面，
// 但用記憶體內的假資料 + setTimeout 模擬延遲取代真實 API（useCats/useRecords/...），
// 讓 Storybook 裡可以真的點擊新增/編輯/刪除紀錄、切換貓咪、切換日期、看多貓總覽。
import { computed, reactive, ref, watch } from 'vue'
import CatTabs from '../../../../cuter-cat-tiger/src/components/cat/CatTabs.vue'
import AddCatSheet from '../../../../cuter-cat-tiger/src/components/cat/AddCatSheet.vue'
import DateNav from '../../../../cuter-cat-tiger/src/components/nav/DateNav.vue'
import DailyStats from '../../../../cuter-cat-tiger/src/components/stats/DailyStats.vue'
import AllCatsStatsSheet from '../../../../cuter-cat-tiger/src/components/stats/AllCatsStatsSheet.vue'
import RecordList from '../../../../cuter-cat-tiger/src/components/record/RecordList.vue'
import RecordFormSheet from '../../../../cuter-cat-tiger/src/components/record/RecordFormSheet.vue'
import ConfirmSheet from '../../../../cuter-cat-tiger/src/components/ui/ConfirmSheet.vue'
import { addDaysToDateKey, dateKeyFromIso, dateTimeLocalValueToIso, todayDateKey } from '../../../../cuter-cat-tiger/src/utils/date'
import type { Cat, CatRecord, DailyStat, RecordType } from '../../../../cuter-cat-tiger/src/types'

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function seedCats(): Cat[] {
  return [
    { id: 1, name: '橘子', createdAt: hoursAgoIso(24 * 30) },
    { id: 2, name: '小黑', createdAt: hoursAgoIso(24 * 20) },
    { id: 3, name: '奶油', createdAt: hoursAgoIso(24 * 10) },
  ]
}

function seedRecords(): CatRecord[] {
  return [
    // 橘子：中等水量/飼料量
    { id: 1, catId: 1, type: 'water', amount: 45, unit: 'ml', note: null, occurredAt: hoursAgoIso(1), updatedAt: null },
    { id: 2, catId: 1, type: 'food', amount: 30, unit: 'g', note: null, occurredAt: hoursAgoIso(3), updatedAt: null },
    { id: 3, catId: 1, type: 'pee', amount: 0, unit: '', note: null, occurredAt: hoursAgoIso(5), updatedAt: null },
    { id: 4, catId: 1, type: 'poop', amount: 0, unit: '', note: '軟便，觀察看看', occurredAt: hoursAgoIso(7), updatedAt: null },
    // 小黑：水量刻意偏低，用來示範 AllCatsStatsSheet「今日喝水較少」標記
    { id: 5, catId: 2, type: 'water', amount: 20, unit: 'ml', note: null, occurredAt: hoursAgoIso(2), updatedAt: null },
    { id: 6, catId: 2, type: 'pee', amount: 0, unit: '', note: null, occurredAt: hoursAgoIso(4), updatedAt: null },
    // 奶油：水量/飼料量偏高，尿尿兩次
    { id: 7, catId: 3, type: 'water', amount: 260, unit: 'ml', note: null, occurredAt: hoursAgoIso(1), updatedAt: null },
    { id: 8, catId: 3, type: 'food', amount: 90, unit: 'g', note: null, occurredAt: hoursAgoIso(2), updatedAt: null },
    { id: 9, catId: 3, type: 'pee', amount: 0, unit: '', note: null, occurredAt: hoursAgoIso(3), updatedAt: null },
    { id: 10, catId: 3, type: 'poop', amount: 0, unit: '', note: null, occurredAt: hoursAgoIso(6), updatedAt: null },
    { id: 11, catId: 3, type: 'pee', amount: 0, unit: '', note: null, occurredAt: hoursAgoIso(8), updatedAt: null },
  ]
}

const cats = reactive<Cat[]>(seedCats())
const records = reactive<CatRecord[]>(seedRecords())
let nextCatId = 4
let nextRecordId = 100

const activeCatId = ref<number | null>(cats[0]?.id ?? null)
const activeCatName = computed(() => cats.find((c) => c.id === activeCatId.value)?.name ?? '')
const selectedDate = ref(todayDateKey())

function goPrevDay() {
  selectedDate.value = addDaysToDateKey(selectedDate.value, -1)
}
function goNextDay() {
  selectedDate.value = addDaysToDateKey(selectedDate.value, 1)
}

// ---------- 模擬「切換貓咪/日期會重新打 API」的載入延遲 ----------
const recordsLoading = ref(false)
const statsLoading = ref(false)
let loadTimer: ReturnType<typeof setTimeout> | undefined

watch(
  [activeCatId, selectedDate],
  () => {
    recordsLoading.value = true
    statsLoading.value = true
    clearTimeout(loadTimer)
    loadTimer = setTimeout(() => {
      recordsLoading.value = false
      statsLoading.value = false
    }, 350)
  },
  { immediate: true },
)

const filteredRecords = computed(() =>
  records.filter((r) => r.catId === activeCatId.value && dateKeyFromIso(r.occurredAt) === selectedDate.value),
)

function statsForDate(date: string): DailyStat[] {
  return cats.map((cat) => {
    const dayRecords = records.filter((r) => r.catId === cat.id && dateKeyFromIso(r.occurredAt) === date)
    const catRecords = records.filter((r) => r.catId === cat.id)
    const lastOf = (type: RecordType) =>
      catRecords
        .filter((r) => r.type === type)
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0]?.occurredAt ?? null

    return {
      catId: cat.id,
      name: cat.name,
      waterMl: dayRecords.filter((r) => r.type === 'water').reduce((s, r) => s + r.amount, 0),
      foodG: dayRecords.filter((r) => r.type === 'food').reduce((s, r) => s + r.amount, 0),
      peeCount: dayRecords.filter((r) => r.type === 'pee').length,
      poopCount: dayRecords.filter((r) => r.type === 'poop').length,
      lastPeeAt: lastOf('pee'),
      lastPoopAt: lastOf('poop'),
    }
  })
}

const activeCatStat = computed(() => statsForDate(selectedDate.value).find((s) => s.catId === activeCatId.value))
const waterMl = computed(() => activeCatStat.value?.waterMl ?? 0)
const foodG = computed(() => activeCatStat.value?.foodG ?? 0)
const peeCount = computed(() => activeCatStat.value?.peeCount ?? 0)
const poopCount = computed(() => activeCatStat.value?.poopCount ?? 0)

// ---------- 多貓總覽底部抽屜 ----------
const allCatsStatsOpen = ref(false)
const allCatsStats = ref<DailyStat[]>([])
const allCatsStatsLoading = ref(false)

function openAllCatsStats() {
  allCatsStatsOpen.value = true
  allCatsStatsLoading.value = true
  setTimeout(() => {
    allCatsStats.value = statsForDate(selectedDate.value)
    allCatsStatsLoading.value = false
  }, 300)
}
function closeAllCatsStats() {
  allCatsStatsOpen.value = false
}
function handleAllCatsStatsSelectCat(catId: number) {
  activeCatId.value = catId
  closeAllCatsStats()
}

// ---------- 新增/編輯紀錄底部抽屜 ----------
const recordSheetOpen = ref(false)
const recordSheetMode = ref<'add' | 'edit'>('add')
const recordSheetType = ref<RecordType>('water')
const editingRecord = ref<CatRecord | null>(null)
const saving = ref(false)

function openAddRecord(type: RecordType) {
  recordSheetMode.value = 'add'
  recordSheetType.value = type
  editingRecord.value = null
  recordSheetOpen.value = true
}
function openEditRecord(record: CatRecord) {
  recordSheetMode.value = 'edit'
  recordSheetType.value = record.type
  editingRecord.value = record
  recordSheetOpen.value = true
}
function closeRecordSheet() {
  recordSheetOpen.value = false
}

function handleRecordSave(payload: { amount?: number; timeValue: string; note: string }) {
  const occurredAt = dateTimeLocalValueToIso(payload.timeValue)
  const isLitter = recordSheetType.value === 'pee' || recordSheetType.value === 'poop'
  saving.value = true
  setTimeout(() => {
    if (recordSheetMode.value === 'add') {
      if (activeCatId.value != null) {
        records.push({
          id: nextRecordId++,
          catId: activeCatId.value,
          type: recordSheetType.value,
          amount: isLitter ? 0 : (payload.amount ?? 0),
          unit: isLitter ? '' : recordSheetType.value === 'water' ? 'ml' : 'g',
          note: payload.note || null,
          occurredAt,
          updatedAt: null,
        })
      }
    } else if (editingRecord.value) {
      const target = records.find((r) => r.id === editingRecord.value!.id)
      if (target) {
        if (!isLitter) target.amount = payload.amount ?? target.amount
        target.occurredAt = occurredAt
        target.note = payload.note || null
        target.updatedAt = new Date().toISOString()
      }
    }
    saving.value = false
    closeRecordSheet()
  }, 400)
}

// ---------- 新增貓咪抽屜 ----------
const addCatOpen = ref(false)
const addingCat = ref(false)

function openAddCat() {
  addCatOpen.value = true
}
function closeAddCat() {
  addCatOpen.value = false
}
function handleAddCatSave(name: string) {
  addingCat.value = true
  setTimeout(() => {
    const cat: Cat = { id: nextCatId++, name, createdAt: new Date().toISOString() }
    cats.push(cat)
    activeCatId.value = cat.id
    addingCat.value = false
    closeAddCat()
  }, 400)
}

// ---------- 刪除紀錄確認抽屜 ----------
const deleteConfirmOpen = ref(false)
const pendingDeleteId = ref<number | null>(null)
const deleting = ref(false)

function openDeleteConfirm(id: number) {
  pendingDeleteId.value = id
  deleteConfirmOpen.value = true
}
function closeDeleteConfirm() {
  deleteConfirmOpen.value = false
  pendingDeleteId.value = null
}
function handleConfirmDelete() {
  if (pendingDeleteId.value == null) return
  deleting.value = true
  setTimeout(() => {
    const idx = records.findIndex((r) => r.id === pendingDeleteId.value)
    if (idx !== -1) records.splice(idx, 1)
    deleting.value = false
    closeDeleteConfirm()
  }, 400)
}

// ---------- 重置示範資料 ----------
function resetDemo() {
  cats.splice(0, cats.length, ...seedCats())
  records.splice(0, records.length, ...seedRecords())
  nextCatId = 4
  nextRecordId = 100
  activeCatId.value = cats[0]?.id ?? null
  selectedDate.value = todayDateKey()
  recordSheetOpen.value = false
  addCatOpen.value = false
  deleteConfirmOpen.value = false
  allCatsStatsOpen.value = false
}
</script>

<template>
  <div class="playground">
    <div class="playground-banner">
      <span>這是 Storybook 專用的可互動示範，資料只存在瀏覽器記憶體裡，重新整理就會回到初始狀態。</span>
      <button type="button" class="reset-btn" @click="resetDemo">重置示範資料</button>
    </div>

    <CatTabs :cats="cats" :active-cat-id="activeCatId" @select="(id) => (activeCatId = id)" @add-cat="openAddCat" />

    <div class="card">
      <DateNav :date="selectedDate" @prev-day="goPrevDay" @next-day="goNextDay" @open-all-cats-stats="openAllCatsStats" />

      <DailyStats :water-ml="waterMl" :food-g="foodG" :pee-count="peeCount" :poop-count="poopCount" :loading="statsLoading" />

      <div class="quick-add">
        <button class="stamp-btn water" :disabled="!activeCatId" @click="openAddRecord('water')">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4.2 5 7 8.6 7 12.2A7 7 0 1 1 5 15.2C5 11.6 7.8 8 12 3z" /></svg>
          記錄喝水
        </button>
        <button class="stamp-btn food" :disabled="!activeCatId" @click="openAddRecord('food')">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h16" /><path d="M5 11a7 6.2 0 0 0 14 0" /><path d="M9 11c.4-1.8 1.4-2.8 3-2.8s2.6 1 3 2.8" /></svg>
          記錄飼料
        </button>
        <button class="stamp-btn litter" :disabled="!activeCatId" @click="openAddRecord('pee')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4c2.6 3.2 4.4 5.6 4.4 8.2A4.4 4.4 0 1 1 7.6 12.2C7.6 9.6 9.4 7.2 12 4z" /><circle cx="12" cy="13" r="1.4" /></svg>
          記錄尿尿
        </button>
        <button class="stamp-btn litter" :disabled="!activeCatId" @click="openAddRecord('poop')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20c-4.4 0-7-1.4-7-3.4 0-1.3 1-2.1 2.3-2.5-.6-.6-1-1.4-1-2.3 0-1.7 1.5-2.9 3.2-2.8-.2-.5-.3-1-.3-1.6 0-1.9 1.6-3.4 3.5-3.4 1.7 0 3.1 1.2 3.4 2.8 1.6 0 2.9 1.2 2.9 2.7 0 .8-.3 1.5-.9 2 1.3.4 2.3 1.3 2.3 2.6 0 2-2.6 3.4-7 3.4-.5.3-1 .5-1.4.5s-.9-.2-1-.5z" /></svg>
          記錄大便
        </button>
      </div>

      <RecordList :records="filteredRecords" :loading="recordsLoading" error="" @edit="openEditRecord" @remove="openDeleteConfirm" />
    </div>

    <RecordFormSheet
      :open="recordSheetOpen"
      :mode="recordSheetMode"
      :type="recordSheetType"
      :cat-name="activeCatName"
      :record="editingRecord"
      :saving="saving"
      @cancel="closeRecordSheet"
      @save="handleRecordSave"
    />

    <AddCatSheet :open="addCatOpen" :saving="addingCat" @cancel="closeAddCat" @save="handleAddCatSave" />

    <AllCatsStatsSheet
      :open="allCatsStatsOpen"
      :date="selectedDate"
      :stats="allCatsStats"
      :active-cat-id="activeCatId"
      :loading="allCatsStatsLoading"
      error=""
      @cancel="closeAllCatsStats"
      @select-cat="handleAllCatsStatsSelectCat"
    />

    <ConfirmSheet
      :open="deleteConfirmOpen"
      title="刪除這筆紀錄？"
      message="刪除後無法復原。"
      confirm-text="刪除"
      danger
      :saving="deleting"
      @cancel="closeDeleteConfirm"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>

<style scoped>
.playground {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
}

.playground-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: #fff8e6;
  border-bottom: 1px dashed var(--line);
  font-size: 0.72rem;
  color: var(--ink-soft);
  line-height: 1.4;
}

.reset-btn {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 50px;
  border: 1px solid var(--line);
  background: #fff;
  font-family: var(--font-body);
  font-size: 0.72rem;
  cursor: pointer;
  white-space: nowrap;
}

.reset-btn:hover {
  background: var(--paper);
}

.card {
  background: var(--card);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  overflow: hidden;
}

.quick-add {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid var(--line);
}

.stamp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 50px;
  border: 2px solid var(--water);
  color: var(--water);
  background: transparent;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.stamp-btn.food {
  border-color: var(--food);
  color: var(--food);
}

.stamp-btn.litter {
  border-color: var(--litter);
  color: var(--litter);
}

.stamp-btn:hover:not(:disabled) {
  background: var(--water);
  color: #fff;
}

.stamp-btn.food:hover:not(:disabled) {
  background: var(--food);
}

.stamp-btn.litter:hover:not(:disabled) {
  background: var(--litter);
  color: #fff;
}

.stamp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
