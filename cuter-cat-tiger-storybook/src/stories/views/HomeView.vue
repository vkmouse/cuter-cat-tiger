<script setup lang="ts">
// Storybook 專用檔案，不屬於正式 app 程式碼，只是刻意跟原始碼同名放在對應的
// views/ 資料夾下，方便對照：這裡示範的是 cuter-cat-tiger/src/views/HomeView.vue。
// 目的：把 components/ 底下所有元件組裝成跟正式版一樣的畫面，
// 但用記憶體內的假資料 + setTimeout 模擬延遲取代真實 API（useCats/useRecords/useFeedingSessions/...），
// 讓 Storybook 裡可以真的點擊新增/編輯/刪除紀錄、切換貓咪、編輯貓咪、
// 開始／編輯／完成／取消「先給後測」餵食 session、切換日期、看多貓總覽。
import { computed, reactive, ref, watch } from 'vue'
import CatTabs from '../../../../cuter-cat-tiger/src/components/cat/CatTabs.vue'
import AddCatSheet from '../../../../cuter-cat-tiger/src/components/cat/AddCatSheet.vue'
import EditCatSheet from '../../../../cuter-cat-tiger/src/components/cat/EditCatSheet.vue'
import DateNav from '../../../../cuter-cat-tiger/src/components/nav/DateNav.vue'
import DailyStats from '../../../../cuter-cat-tiger/src/components/stats/DailyStats.vue'
import AllCatsStatsSheet from '../../../../cuter-cat-tiger/src/components/stats/AllCatsStatsSheet.vue'
import RecordList from '../../../../cuter-cat-tiger/src/components/record/RecordList.vue'
import RecordFeedingSheet from '../../../../cuter-cat-tiger/src/components/record/RecordFeedingSheet.vue'
import RecordLitterFormSheet from '../../../../cuter-cat-tiger/src/components/record/RecordLitterFormSheet.vue'
import StartFeedingSheet from '../../../../cuter-cat-tiger/src/components/record/StartFeedingSheet.vue'
import PendingFeedingList from '../../../../cuter-cat-tiger/src/components/record/PendingFeedingList.vue'
import CompleteFeedingSheet from '../../../../cuter-cat-tiger/src/components/record/CompleteFeedingSheet.vue'
import ConfirmSheet from '../../../../cuter-cat-tiger/src/components/ui/ConfirmSheet.vue'
import { addDaysToDateKey, dateKeyFromIso, dateTimeLocalValueToIso, todayDateKey } from '../../../../cuter-cat-tiger/src/utils/date'
import type { Cat, CatRecord, DailyStat, FeedingSession, RecordType } from '../../../../cuter-cat-tiger/src/types'

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

function seedCats(): Cat[] {
  return [
    { id: 1, name: '橘子', targetWater: 200, targetFood: 60, createdAt: hoursAgoIso(24 * 30) },
    { id: 2, name: '小黑', targetWater: 180, targetFood: 50, createdAt: hoursAgoIso(24 * 20) },
    { id: 3, name: '奶油', targetWater: 220, targetFood: 70, createdAt: hoursAgoIso(24 * 10) },
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

// 橘子先給了水但還沒量剩下多少，示範 PendingFeedingList／完成量測／取消 的操作。
function seedFeedingSessions(): FeedingSession[] {
  return [{ id: 1, catId: 1, type: 'water', givenAmount: 50, unit: 'ml', givenAt: minutesAgoIso(20), updatedAt: null }]
}

const cats = reactive<Cat[]>(seedCats())
const records = reactive<CatRecord[]>(seedRecords())
const feedingSessions = reactive<FeedingSession[]>(seedFeedingSessions())
let nextCatId = 4
let nextRecordId = 100
let nextSessionId = 100

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

// 只顯示目前這隻貓正在進行中的餵食 session（跟 useFeedingSessions 依 catId 查詢的行為一致）。
const activeFeedingSessions = computed(() => feedingSessions.filter((s) => s.catId === activeCatId.value))

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
      targetWater: cat.targetWater,
      targetFood: cat.targetFood,
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

// ---------- 新增/編輯喝水飼料底部抽屜 ----------
const feedingRecordSheetOpen = ref(false)
const feedingRecordSheetMode = ref<'add' | 'edit'>('add')
const feedingRecordSheetType = ref<'water' | 'food'>('water')
const editingFeedingRecord = ref<CatRecord | null>(null)
const feedingRecordSaving = ref(false)
// 只在「從 StartFeedingSheet 切換過來」時會帶值，開給 RecordFeedingSheet 的 :initial-amount / :initial-note 用。
const feedingRecordSheetInitialAmount = ref('')
const feedingRecordSheetInitialNote = ref('')

// ---------- 新增/編輯尿尿大便底部抽屜 ----------
const litterSheetOpen = ref(false)
const litterSheetMode = ref<'add' | 'edit'>('add')
const litterSheetType = ref<'pee' | 'poop'>('pee')
const editingLitterRecord = ref<CatRecord | null>(null)
const litterSaving = ref(false)

// ---------- 開始餵/修改給的量底部抽屜（先給後測 step 1） ----------
const feedingSheetOpen = ref(false)
const feedingSheetMode = ref<'add' | 'edit'>('add')
const feedingSheetType = ref<'water' | 'food'>('water')
const editingFeedingSession = ref<FeedingSession | null>(null)
const feedingSessionSaving = ref(false)
// 只在「從 RecordFeedingSheet 切換過來」時會帶值，開給 StartFeedingSheet 的 :initial-amount / :initial-note 用。
const feedingSheetInitialAmount = ref('')
const feedingSheetInitialNote = ref('')

function openAddFeedingRecord(type: 'water' | 'food', initialAmount = '', initialNote = '') {
  feedingRecordSheetMode.value = 'add'
  feedingRecordSheetType.value = type
  editingFeedingRecord.value = null
  feedingRecordSheetInitialAmount.value = initialAmount
  feedingRecordSheetInitialNote.value = initialNote
  feedingRecordSheetOpen.value = true
}

function openAddLitterRecord(type: 'pee' | 'poop') {
  litterSheetMode.value = 'add'
  litterSheetType.value = type
  editingLitterRecord.value = null
  litterSheetOpen.value = true
}

function openStartFeedingSession(type: 'water' | 'food', initialAmount = '', initialNote = '') {
  feedingSheetMode.value = 'add'
  feedingSheetType.value = type
  editingFeedingSession.value = null
  feedingSheetInitialAmount.value = initialAmount
  feedingSheetInitialNote.value = initialNote
  feedingSheetOpen.value = true
}

function openAddRecord(type: RecordType) {
  if (type === 'water' || type === 'food') {
    openAddFeedingRecord(type)
  } else {
    openAddLitterRecord(type)
  }
}

function openEditRecord(record: CatRecord) {
  if (record.type === 'water' || record.type === 'food') {
    feedingRecordSheetMode.value = 'edit'
    feedingRecordSheetType.value = record.type
    editingFeedingRecord.value = record
    feedingRecordSheetOpen.value = true
  } else {
    litterSheetMode.value = 'edit'
    litterSheetType.value = record.type
    editingLitterRecord.value = record
    litterSheetOpen.value = true
  }
}

function openEditFeedingSession(session: FeedingSession) {
  feedingSheetMode.value = 'edit'
  feedingSheetType.value = session.type
  editingFeedingSession.value = session
  feedingSheetOpen.value = true
}

function closeFeedingRecordSheet() {
  feedingRecordSheetOpen.value = false
}

function closeLitterSheet() {
  litterSheetOpen.value = false
}

function closeFeedingSheet() {
  feedingSheetOpen.value = false
}

function switchRecordToFeeding(payload: { amount: string; note: string }) {
  closeFeedingRecordSheet()
  openStartFeedingSession(feedingRecordSheetType.value, payload.amount, payload.note)
}

function switchFeedingToRecord(payload: { amount: string; note: string }) {
  closeFeedingSheet()
  openAddFeedingRecord(feedingSheetType.value, payload.amount, payload.note)
}

function handleFeedingRecordSave(payload: { amount: number; timeValue: string; note: string }) {
  feedingRecordSaving.value = true
  setTimeout(() => {
    const occurredAt = dateTimeLocalValueToIso(payload.timeValue)

    if (feedingRecordSheetMode.value === 'add') {
      if (activeCatId.value != null) {
        records.push({
          id: nextRecordId++,
          catId: activeCatId.value,
          type: feedingRecordSheetType.value,
          amount: payload.amount,
          unit: feedingRecordSheetType.value === 'water' ? 'ml' : 'g',
          note: payload.note || null,
          occurredAt,
          updatedAt: null,
        })
      }
    } else if (editingFeedingRecord.value) {
      const target = records.find((r) => r.id === editingFeedingRecord.value!.id)
      if (target) {
        target.amount = payload.amount
        target.occurredAt = occurredAt
        target.note = payload.note || null
        target.updatedAt = new Date().toISOString()
      }
    }
    feedingRecordSaving.value = false
    closeFeedingRecordSheet()
  }, 400)
}

function handleLitterSave(payload: { timeValue: string; note: string }) {
  litterSaving.value = true
  setTimeout(() => {
    const occurredAt = dateTimeLocalValueToIso(payload.timeValue)

    if (litterSheetMode.value === 'add') {
      if (activeCatId.value != null) {
        records.push({
          id: nextRecordId++,
          catId: activeCatId.value,
          type: litterSheetType.value,
          amount: 0,
          unit: '',
          note: payload.note || null,
          occurredAt,
          updatedAt: null,
        })
      }
    } else if (editingLitterRecord.value) {
      const target = records.find((r) => r.id === editingLitterRecord.value!.id)
      if (target) {
        target.occurredAt = occurredAt
        target.note = payload.note || null
        target.updatedAt = new Date().toISOString()
      }
    }
    litterSaving.value = false
    closeLitterSheet()
  }, 400)
}

function handleFeedingSave(payload: { amount: number }) {
  feedingSessionSaving.value = true
  setTimeout(() => {
    if (feedingSheetMode.value === 'add') {
      if (activeCatId.value != null) {
        feedingSessions.push({
          id: nextSessionId++,
          catId: activeCatId.value,
          type: feedingSheetType.value,
          givenAmount: payload.amount,
          unit: feedingSheetType.value === 'water' ? 'ml' : 'g',
          givenAt: new Date().toISOString(),
          updatedAt: null,
        })
      }
    } else if (editingFeedingSession.value) {
      const target = feedingSessions.find((s) => s.id === editingFeedingSession.value!.id)
      if (target) {
        target.givenAmount = payload.amount
        target.updatedAt = new Date().toISOString()
      }
    }
    feedingSessionSaving.value = false
    closeFeedingSheet()
  }, 400)
}

// ---------- 完成量測：把 session 轉成一筆真正的紀錄 ----------
const completeSheetOpen = ref(false)
const completingSession = ref<FeedingSession | null>(null)
const feedingSessionCompleting = ref(false)

function openCompleteFeedingSession(session: FeedingSession) {
  completingSession.value = session
  completeSheetOpen.value = true
}
function closeCompleteSheet() {
  completeSheetOpen.value = false
  completingSession.value = null
}

function handleCompleteSave(payload: { remainingAmount: number; timeValue: string; note: string }) {
  if (!completingSession.value) return
  const session = completingSession.value
  feedingSessionCompleting.value = true
  setTimeout(() => {
    // consumed 一律由「給的量」與「剩下多少」重新算，模擬伺服器端的行為（不信任前端算好的值）。
    const consumed = Math.max(0, Math.round((session.givenAmount - payload.remainingAmount) * 10) / 10)
    records.push({
      id: nextRecordId++,
      catId: session.catId,
      type: session.type,
      amount: consumed,
      unit: session.unit,
      note: payload.note || null,
      occurredAt: dateTimeLocalValueToIso(payload.timeValue),
      updatedAt: null,
    })
    const idx = feedingSessions.findIndex((s) => s.id === session.id)
    if (idx !== -1) feedingSessions.splice(idx, 1)
    feedingSessionCompleting.value = false
    closeCompleteSheet()
  }, 400)
}

// ---------- 取消進行中的餵食 session ----------
const cancelSessionConfirmOpen = ref(false)
const pendingCancelSession = ref<FeedingSession | null>(null)
const feedingSessionCancelling = ref(false)

function openCancelSessionConfirm(session: FeedingSession) {
  pendingCancelSession.value = session
  cancelSessionConfirmOpen.value = true
}
function closeCancelSessionConfirm() {
  cancelSessionConfirmOpen.value = false
  pendingCancelSession.value = null
}
function handleConfirmCancelSession() {
  if (!pendingCancelSession.value) return
  const id = pendingCancelSession.value.id
  feedingSessionCancelling.value = true
  setTimeout(() => {
    const idx = feedingSessions.findIndex((s) => s.id === id)
    if (idx !== -1) feedingSessions.splice(idx, 1)
    feedingSessionCancelling.value = false
    closeCancelSessionConfirm()
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
    const cat: Cat = { id: nextCatId++, name, targetWater: 200, targetFood: 60, createdAt: new Date().toISOString() }
    cats.push(cat)
    activeCatId.value = cat.id
    addingCat.value = false
    closeAddCat()
  }, 400)
}

// ---------- 編輯貓咪抽屜：點目前已選中的 tab 會浮出編輯鈕（見 CatTabs） ----------
const editCatOpen = ref(false)
const editingCat = ref<Cat | null>(null)
const editingCatSaving = ref(false)

function openEditCat(catId: number) {
  const cat = cats.find((c) => c.id === catId)
  if (!cat) return
  editingCat.value = cat
  editCatOpen.value = true
}
function closeEditCat() {
  editCatOpen.value = false
  editingCat.value = null
}
function handleEditCatSave(payload: { name: string; targetWater: number; targetFood: number }) {
  if (!editingCat.value) return
  const id = editingCat.value.id
  editingCatSaving.value = true
  setTimeout(() => {
    const target = cats.find((c) => c.id === id)
    if (target) {
      target.name = payload.name
      target.targetWater = payload.targetWater
      target.targetFood = payload.targetFood
    }
    editingCatSaving.value = false
    closeEditCat()
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
  feedingSessions.splice(0, feedingSessions.length, ...seedFeedingSessions())
  nextCatId = 4
  nextRecordId = 100
  nextSessionId = 100
  activeCatId.value = cats[0]?.id ?? null
  selectedDate.value = todayDateKey()
  feedingRecordSheetOpen.value = false
  litterSheetOpen.value = false
  completeSheetOpen.value = false
  cancelSessionConfirmOpen.value = false
  addCatOpen.value = false
  editCatOpen.value = false
  deleteConfirmOpen.value = false
  allCatsStatsOpen.value = false
}
</script>

<template>
  <div class="playground">
    <div class="playground-banner">
      <span>這是 Storybook 專用的可互動示範，資料只存在瀏覽器記憶體裡，重新整理就會回到初始狀態。點目前選中的貓咪分頁可以浮出「編輯貓咪」按鈕。</span>
      <button type="button" class="reset-btn" @click="resetDemo">重置示範資料</button>
    </div>

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
        :sessions="activeFeedingSessions"
        @complete="openCompleteFeedingSession"
        @edit="openEditFeedingSession"
        @cancel="openCancelSessionConfirm"
      />

      <RecordList :records="filteredRecords" :loading="recordsLoading" error="" @edit="openEditRecord" @remove="openDeleteConfirm" />
    </div>
  </div>

  <RecordFeedingSheet
    :open="feedingRecordSheetOpen"
    :mode="feedingRecordSheetMode"
    :type="feedingRecordSheetType"
    :cat-name="activeCatName"
    :record="editingFeedingRecord"
    :saving="feedingRecordSaving"
    :initial-amount="feedingRecordSheetInitialAmount"
    :initial-note="feedingRecordSheetInitialNote"
    @cancel="closeFeedingRecordSheet"
    @save="handleFeedingRecordSave"
    @switch-to-feeding="switchRecordToFeeding"
  />

  <RecordLitterFormSheet
    :open="litterSheetOpen"
    :mode="litterSheetMode"
    :type="litterSheetType"
    :cat-name="activeCatName"
    :record="editingLitterRecord"
    :saving="litterSaving"
    @cancel="closeLitterSheet"
    @save="handleLitterSave"
  />

  <StartFeedingSheet
    :open="feedingSheetOpen"
    :mode="feedingSheetMode"
    :type="feedingSheetType"
    :cat-name="activeCatName"
    :feeding-session="editingFeedingSession"
    :saving="feedingSessionSaving"
    :initial-amount="feedingSheetInitialAmount"
    :initial-note="feedingSheetInitialNote"
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
