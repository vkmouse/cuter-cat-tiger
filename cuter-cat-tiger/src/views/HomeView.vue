<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CatTabs from '../components/record/CatTabs.vue'
import DateNav from '../components/record/DateNav.vue'
import DailyStats from '../components/record/DailyStats.vue'
import RecordList from '../components/record/RecordList.vue'
import RecordFormSheet from '../components/record/RecordFormSheet.vue'
import AddCatSheet from '../components/record/AddCatSheet.vue'
import ConfirmSheet from '../components/record/ConfirmSheet.vue'
import { useCats } from '../composables/useCats'
import { useRecords } from '../composables/useRecords'
import { useDailyStats } from '../composables/useDailyStats'
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
      activeCatId.value = list[0].id
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

const { waterMl, foodG, loading: statsLoading } = useDailyStats(activeCatId, selectedDate)

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

async function handleSave(payload: { amount: number; timeValue: string; note: string }) {
  const occurredAt = dateTimeLocalValueToIso(payload.timeValue)
  const unit = sheetType.value === 'water' ? 'ml' : 'g'

  if (sheetMode.value === 'add') {
    if (activeCatId.value == null) return
    await addRecord({
      catId: activeCatId.value,
      type: sheetType.value,
      amount: payload.amount,
      unit,
      note: payload.note || null,
      occurredAt,
    })
  } else if (editingRecord.value) {
    await editRecord(editingRecord.value.id, {
      amount: payload.amount,
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
      <DateNav :date="selectedDate" @prev-day="goPrevDay" @next-day="goNextDay" />

      <DailyStats :water-ml="waterMl" :food-g="foodG" :loading="statsLoading" />

      <div class="quick-add">
        <button class="stamp-btn water" :disabled="!activeCatId" @click="openAdd('water')">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4.2 5 7 8.6 7 12.2A7 7 0 1 1 5 15.2C5 11.6 7.8 8 12 3z" /></svg>
          記錄喝水
        </button>
        <button class="stamp-btn food" :disabled="!activeCatId" @click="openAdd('food')">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h16" /><path d="M5 11a7 6.2 0 0 0 14 0" /><path d="M9 11c.4-1.8 1.4-2.8 3-2.8s2.6 1 3 2.8" /></svg>
          記錄飼料
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

.quick-add {
  display: flex;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid var(--line);
}

.stamp-btn {
  flex: 1;
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

.stamp-btn:hover:not(:disabled) {
  background: var(--water);
  color: #fff;
}

.stamp-btn.food:hover:not(:disabled) {
  background: var(--food);
}

.stamp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
