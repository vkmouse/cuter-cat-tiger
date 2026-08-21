<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CatTabs from '../components/cat/CatTabs.vue'
import AddCatSheet from '../components/cat/AddCatSheet.vue'
import EditCatSheet from '../components/cat/EditCatSheet.vue'
import DateNav from '../components/nav/DateNav.vue'
import DailyStats from '../components/stats/DailyStats.vue'
import AllCatsStatsSheet from '../components/stats/AllCatsStatsSheet.vue'
import RecordList from '../components/record/RecordList.vue'
import RecordFormSheet from '../components/record/RecordFormSheet.vue'
import StartFeedingSheet from '../components/record/StartFeedingSheet.vue'
import PendingFeedingList from '../components/record/PendingFeedingList.vue'
import CompleteFeedingSheet from '../components/record/CompleteFeedingSheet.vue'
import { recordNoteUsage } from '../composables/useQuickNotes'
import ConfirmSheet from '../components/ui/ConfirmSheet.vue'
import { useCats } from '../composables/useCats'
import { useRecords } from '../composables/useRecords'
import { useFeedingSessions } from '../composables/useFeedingSessions'
import { useDailyStats } from '../composables/useDailyStats'
import { useAllCatsDailyStats } from '../composables/useAllCatsDailyStats'
import { addDaysToDateKey, dateTimeLocalValueToIso, todayDateKey } from '../utils/date'
import type { Cat, CatRecord, FeedingSession, RecordType } from '../types'

const { cats, loading: catsLoading, addCat, updateCat } = useCats()

const activeCatId = ref<number | null>(null)

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

const {
  sessions: feedingSessions,
  startSession,
  editSession,
  cancelSession,
  completeSession,
  starting: feedingSessionSaving,
  cancelling: feedingSessionCancelling,
  completing: feedingSessionCompleting,
} = useFeedingSessions(activeCatId)

const allCatsStatsOpen = ref(false)
const {
  stats: allCatsStats,
  loading: allCatsStatsLoading,
  error: allCatsStatsError,
} = useAllCatsDailyStats(selectedDate, allCatsStatsOpen)

function openAllCatsStats() {
  allCatsStatsOpen.value = true
}
function closeAllCatsStats() {
  allCatsStatsOpen.value = false
}
function handleAllCatsStatsSelectCat(catId: number) {
  activeCatId.value = catId
  closeAllCatsStats()
}

const recordSheetOpen = ref(false)
const recordSheetMode = ref<'add' | 'edit'>('add')
const recordSheetType = ref<RecordType>('water')
const editingRecord = ref<CatRecord | null>(null)

const feedingSheetOpen = ref(false)
const feedingSheetMode = ref<'add' | 'edit'>('add')
const feedingSheetType = ref<'water' | 'food'>('water')
const editingFeedingSession = ref<FeedingSession | null>(null)

function openAddRecord(type: RecordType) {
  recordSheetMode.value = 'add'
  recordSheetType.value = type
  editingRecord.value = null
  recordSheetOpen.value = true
}

function openStartFeedingSession(type: 'water' | 'food') {
  feedingSheetMode.value = 'add'
  feedingSheetType.value = type
  editingFeedingSession.value = null
  feedingSheetOpen.value = true
}

function openEditRecord(record: CatRecord) {
  recordSheetMode.value = 'edit'
  recordSheetType.value = record.type
  editingRecord.value = record
  recordSheetOpen.value = true
}

function openEditFeedingSession(session: FeedingSession) {
  feedingSheetMode.value = 'edit'
  feedingSheetType.value = session.type
  editingFeedingSession.value = session
  feedingSheetOpen.value = true
}

function closeRecordSheet() {
  recordSheetOpen.value = false
}

function closeFeedingSheet() {
  feedingSheetOpen.value = false
}

// Sheet 頂端的 pill 只是換一顆 sheet，不是切內部狀態：關掉目前這個，開另一個。
// 兩邊本來就會把 amount 清空重填，所以切換時沒有輸入內容需要保留。
function switchRecordToFeeding() {
  if (recordSheetType.value !== 'water' && recordSheetType.value !== 'food') return
  closeRecordSheet()
  openStartFeedingSession(recordSheetType.value)
}

function switchFeedingToRecord() {
  closeFeedingSheet()
  openAddRecord(feedingSheetType.value)
}

async function handleRecordSave(payload: { amount?: number; timeValue: string; note: string }) {
  const occurredAt = dateTimeLocalValueToIso(payload.timeValue)
  const isLitter = recordSheetType.value === 'pee' || recordSheetType.value === 'poop'

  if (recordSheetMode.value === 'add') {
    if (activeCatId.value == null) return
    await addRecord({
      catId: activeCatId.value,
      type: recordSheetType.value,
      ...(isLitter ? {} : { amount: payload.amount, unit: recordSheetType.value === 'water' ? 'ml' : 'g' }),
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
  recordNoteUsage(recordSheetType.value, payload.note)
  closeRecordSheet()
}

async function handleFeedingSave(payload: { amount: number }) {
  if (feedingSheetMode.value === 'add') {
    if (activeCatId.value == null) return
    await startSession({
      catId: activeCatId.value,
      type: feedingSheetType.value,
      amount: payload.amount,
      unit: feedingSheetType.value === 'water' ? 'ml' : 'g',
    })
  } else if (editingFeedingSession.value) {
    await editSession(editingFeedingSession.value.id, { amount: payload.amount })
  }
  closeFeedingSheet()
}

const completeSheetOpen = ref(false)
const completingSession = ref<FeedingSession | null>(null)

function openCompleteFeedingSession(session: FeedingSession) {
  completingSession.value = session
  completeSheetOpen.value = true
}

function closeCompleteSheet() {
  completeSheetOpen.value = false
  completingSession.value = null
}

async function handleCompleteSave(payload: { remainingAmount: number; timeValue: string; note: string }) {
  if (!completingSession.value) return
  await completeSession(completingSession.value.id, {
    remainingAmount: payload.remainingAmount,
    occurredAt: dateTimeLocalValueToIso(payload.timeValue),
    note: payload.note || null,
  })
  recordNoteUsage(completingSession.value.type, payload.note)
  closeCompleteSheet()
}

const cancelSessionConfirmOpen = ref(false)
const pendingCancelSession = ref<FeedingSession | null>(null)

function openCancelSessionConfirm(session: FeedingSession) {
  pendingCancelSession.value = session
  cancelSessionConfirmOpen.value = true
}

function closeCancelSessionConfirm() {
  cancelSessionConfirmOpen.value = false
  pendingCancelSession.value = null
}

async function handleConfirmCancelSession() {
  if (!pendingCancelSession.value) return
  await cancelSession(pendingCancelSession.value.id)
  closeCancelSessionConfirm()
}

const addCatOpen = ref(false)
const addingCat = ref(false)

function openAddCat() {
  addCatOpen.value = true
}

function closeAddCat() {
  addCatOpen.value = false
}

async function handleAddCatSave(name: string) {
  addingCat.value = true
  try {
    const cat = await addCat(name)
    activeCatId.value = cat.id
    closeAddCat()
  } finally {
    addingCat.value = false
  }
}

const editCatOpen = ref(false)
const editingCat = ref<Cat | null>(null)
const editingCatSaving = ref(false)

function openEditCat(catId: number) {
  const cat = cats.value.find((c) => c.id === catId)
  if (!cat) return
  editingCat.value = cat
  editCatOpen.value = true
}

function closeEditCat() {
  editCatOpen.value = false
  editingCat.value = null
}

async function handleEditCatSave(payload: { name: string; targetWater: number; targetFood: number }) {
  if (!editingCat.value) return
  editingCatSaving.value = true
  try {
    await updateCat(editingCat.value.id, payload)
    closeEditCat()
  } finally {
    editingCatSaving.value = false
  }
}

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
    <CatTabs
      :cats="cats"
      :active-cat-id="activeCatId"
      @select="(id) => (activeCatId = id)"
      @add-cat="openAddCat"
      @edit-cat="openEditCat"
    />

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

      <PendingFeedingList
        :sessions="feedingSessions"
        @complete="openCompleteFeedingSession"
        @edit="openEditFeedingSession"
        @cancel="openCancelSessionConfirm"
      />

      <RecordList :records="records" :loading="recordsLoading" :error="recordsError" @edit="openEditRecord" @remove="openDeleteConfirm" />
    </div>
  </template>

  <RecordFormSheet
    :open="recordSheetOpen"
    :mode="recordSheetMode"
    :type="recordSheetType"
    :cat-name="activeCatName"
    :record="editingRecord"
    :saving="saving"
    @cancel="closeRecordSheet"
    @save="handleRecordSave"
    @switch-to-feeding="switchRecordToFeeding"
  />

  <StartFeedingSheet
    :open="feedingSheetOpen"
    :mode="feedingSheetMode"
    :type="feedingSheetType"
    :cat-name="activeCatName"
    :feeding-session="editingFeedingSession"
    :saving="feedingSessionSaving"
    @cancel="closeFeedingSheet"
    @save="handleFeedingSave"
    @switch-to-record="switchFeedingToRecord"
  />

  <CompleteFeedingSheet
    :open="completeSheetOpen"
    :cat-name="activeCatName"
    :session="completingSession"
    :saving="feedingSessionCompleting"
    @cancel="closeCompleteSheet"
    @save="handleCompleteSave"
  />

  <ConfirmSheet
    :open="cancelSessionConfirmOpen"
    title="取消這次餵食？"
    message="取消後這筆「先給後測」的紀錄會直接消失，不會產生任何紀錄。"
    confirm-text="確定取消"
    danger
    :saving="feedingSessionCancelling"
    @cancel="closeCancelSessionConfirm"
    @confirm="handleConfirmCancelSession"
  />

  <AddCatSheet :open="addCatOpen" :saving="addingCat" @cancel="closeAddCat" @save="handleAddCatSave" />

  <EditCatSheet
    :open="editCatOpen"
    :cat="editingCat"
    :saving="editingCatSaving"
    @cancel="closeEditCat"
    @save="handleEditCatSave"
  />

  <AllCatsStatsSheet
    :open="allCatsStatsOpen"
    :date="selectedDate"
    :stats="allCatsStats"
    :active-cat-id="activeCatId"
    :loading="allCatsStatsLoading"
    :error="allCatsStatsError"
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

/* 每個操作項目需要維持足夠的點擊區域。 */
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
