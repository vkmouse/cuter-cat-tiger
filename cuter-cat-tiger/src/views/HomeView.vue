<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CatTabs from '../components/record/CatTabs.vue'
import DateNav from '../components/record/DateNav.vue'
import DailyStats from '../components/record/DailyStats.vue'
import RecordList from '../components/record/RecordList.vue'
import RecordFormSheet from '../components/record/RecordFormSheet.vue'
import AddCatSheet from '../components/record/AddCatSheet.vue'
import ConfirmSheet from '../components/record/ConfirmSheet.vue'
import OverviewSheet from '../components/record/OverviewSheet.vue'
import { useCats } from '../composables/useCats'
import { useRecords } from '../composables/useRecords'
import { useDailyStats } from '../composables/useDailyStats'
import { useAllCatsDailyStats } from '../composables/useAllCatsDailyStats'
import { addDaysToDateKey, dateTimeLocalValueToIso, todayDateKey } from '../utils/date'
import type { CatRecord, RecordType } from '../types'

const { cats, loading: catsLoading, addCat } = useCats()

const activeCatId = ref<number | null>(null)

// 貓咪列表載入後，預設選第一隻；若目前選的貓咪被刪除了，也退回第一隻。
watch(
  cats,
  (list) => {
    if (list.length === 0) {
      activeCatId.value = null
      return
    }
    if (!activeCatId.value || !list.some((c) => c.id === activeCatId.value)) {
      activeCatId.value = list[0]!.id
    }
  },
  { immediate: true },
)

const activeCatName = computed(() => cats.value.find((c) => c.id === activeCatId.value)?.name ?? '')

const selectedDate = ref(todayDateKey())

function goPrevDay() {
  selectedDate.value = addDaysToDateKey(selectedDate.value, -1)
}
function goNextDay() {
  // 「往未來日期翻頁」是否要限制尚未定案（frontend-spec.md 第7節），目前先不限制。
  selectedDate.value = addDaysToDateKey(selectedDate.value, 1)
}

const {
  records,
  loading: recordsLoading,
  error: recordsError,
  addRecord,
  editRecord,
  removeRecord,
  saving,
  deleting,
} = useRecords(activeCatId, selectedDate)

const { waterMl, foodG, peeCount, poopCount, loading: statsLoading } = useDailyStats(activeCatId, selectedDate)

// ---------- 多貓總覽底部抽屜 ----------
const overviewOpen = ref(false)
const {
  stats: allCatsStats,
  loading: allCatsStatsLoading,
  error: allCatsStatsError,
} = useAllCatsDailyStats(selectedDate, overviewOpen)

function openOverview() {
  overviewOpen.value = true
}
function closeOverview() {
  overviewOpen.value = false
}
function handleOverviewSelectCat(catId: number) {
  activeCatId.value = catId
  closeOverview()
}

// ---------- 底部抽屜（新增／編輯共用） ----------
const sheetOpen = ref(false)
const sheetMode = ref<'add' | 'edit'>('add')
const sheetType = ref<RecordType>('water')
const editingRecord = ref<CatRecord | null>(null)

function openAdd(type: RecordType) {
  sheetMode.value = 'add'
  sheetType.value = type
  editingRecord.value = null
  sheetOpen.value = true
}

function openEdit(record: CatRecord) {
  sheetMode.value = 'edit'
  sheetType.value = record.type
  editingRecord.value = record
  sheetOpen.value = true
}

function closeSheet() {
  sheetOpen.value = false
}

async function handleSave(payload: { amount?: number; timeValue: string; note: string }) {
  const occurredAt = dateTimeLocalValueToIso(payload.timeValue)
  const isLitter = sheetType.value === 'pee' || sheetType.value === 'poop'

  if (sheetMode.value === 'add') {
    if (activeCatId.value == null) return
    await addRecord({
      catId: activeCatId.value,
      type: sheetType.value,
      // pee/poop 不量化，不帶 amount/unit（帶了後端也會忽略、強制存 0/''，見 litter-record-spec.md 第3.2節）
      ...(isLitter ? {} : { amount: payload.amount, unit: sheetType.value === 'water' ? 'ml' : 'g' }),
      note: payload.note || null,
      occurredAt,
    })
  } else if (editingRecord.value) {
    await editRecord(editingRecord.value.id, {
      ...(isLitter ? {} : { amount: payload.amount }),
      occurredAt,
      note: payload.note || null,
    })
  }
  closeSheet()
}

// ---------- 新增貓咪抽屜 ----------
const addCatSheetOpen = ref(false)
const addingCat = ref(false)

function openAddCatSheet() {
  addCatSheetOpen.value = true
}

function closeAddCatSheet() {
  addCatSheetOpen.value = false
}

async function handleAddCatSave(name: string) {
  addingCat.value = true
  try {
    const cat = await addCat(name)
    activeCatId.value = cat.id
    closeAddCatSheet()
  } finally {
    addingCat.value = false
  }
}

// ---------- 刪除紀錄確認抽屜 ----------
const deleteConfirmOpen = ref(false)
const pendingDeleteId = ref<number | null>(null)

function openDeleteConfirm(id: number) {
  pendingDeleteId.value = id
  deleteConfirmOpen.value = true
}

function closeDeleteConfirm() {
  deleteConfirmOpen.value = false
  pendingDeleteId.value = null
}

async function handleConfirmDelete() {
  if (pendingDeleteId.value == null) return
  await removeRecord(pendingDeleteId.value)
  closeDeleteConfirm()
}
</script>

<template>
  <div v-if="catsLoading" class="loading-state">載入貓咪清單中…</div>
  <template v-else>
    <CatTabs :cats="cats" :active-cat-id="activeCatId" @select="(id) => (activeCatId = id)" @add-cat="openAddCatSheet" />

    <div class="card">
      <DateNav :date="selectedDate" @prev-day="goPrevDay" @next-day="goNextDay" @open-overview="openOverview" />

      <DailyStats :water-ml="waterMl" :food-g="foodG" :pee-count="peeCount" :poop-count="poopCount" :loading="statsLoading" />

      <div class="quick-add">
        <button class="stamp-btn water" :disabled="!activeCatId" @click="openAdd('water')">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4.2 5 7 8.6 7 12.2A7 7 0 1 1 5 15.2C5 11.6 7.8 8 12 3z" /></svg>
          記錄喝水
        </button>
        <button class="stamp-btn food" :disabled="!activeCatId" @click="openAdd('food')">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h16" /><path d="M5 11a7 6.2 0 0 0 14 0" /><path d="M9 11c.4-1.8 1.4-2.8 3-2.8s2.6 1 3 2.8" /></svg>
          記錄飼料
        </button>
        <button class="stamp-btn litter" :disabled="!activeCatId" @click="openAdd('pee')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4c2.6 3.2 4.4 5.6 4.4 8.2A4.4 4.4 0 1 1 7.6 12.2C7.6 9.6 9.4 7.2 12 4z" /><circle cx="12" cy="13" r="1.4" /></svg>
          記錄尿尿
        </button>
        <button class="stamp-btn litter" :disabled="!activeCatId" @click="openAdd('poop')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20c-4.4 0-7-1.4-7-3.4 0-1.3 1-2.1 2.3-2.5-.6-.6-1-1.4-1-2.3 0-1.7 1.5-2.9 3.2-2.8-.2-.5-.3-1-.3-1.6 0-1.9 1.6-3.4 3.5-3.4 1.7 0 3.1 1.2 3.4 2.8 1.6 0 2.9 1.2 2.9 2.7 0 .8-.3 1.5-.9 2 1.3.4 2.3 1.3 2.3 2.6 0 2-2.6 3.4-7 3.4-.5.3-1 .5-1.4.5s-.9-.2-1-.5z" /></svg>
          記錄大便
        </button>
      </div>

      <RecordList :records="records" :loading="recordsLoading" :error="recordsError" @edit="openEdit" @remove="openDeleteConfirm" />
    </div>
  </template>

  <RecordFormSheet
    :open="sheetOpen"
    :mode="sheetMode"
    :type="sheetType"
    :cat-name="activeCatName"
    :record="editingRecord"
    :saving="saving"
    @cancel="closeSheet"
    @save="handleSave"
  />

  <AddCatSheet :open="addCatSheetOpen" :saving="addingCat" @cancel="closeAddCatSheet" @save="handleAddCatSave" />

  <OverviewSheet
    :open="overviewOpen"
    :date="selectedDate"
    :stats="allCatsStats"
    :active-cat-id="activeCatId"
    :loading="allCatsStatsLoading"
    :error="allCatsStatsError"
    @cancel="closeOverview"
    @select-cat="handleOverviewSelectCat"
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
</template>

<style scoped>
.loading-state {
  text-align: center;
  color: var(--ink-soft);
  font-size: 0.88rem;
  padding: 30px 0;
}

.card {
  background: var(--card);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  overflow: hidden;
}

/* 原本 2 顆一排，新增 pee/poop 後變成 4 顆，改成兩排兩欄（決策點1），
   4 顆維持原本藥丸大小與字級，避免擠壓成不好點的窄按鈕。 */
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
