import type { Meta, StoryObj } from '@storybook/vue3-vite'

import RecordFeedingSheet from '../../../../../cuter-cat-tiger/src/components/record/RecordFeedingSheet.vue'
import type { CatRecord } from '../../../../../cuter-cat-tiger/src/types'

function makeRecord(overrides: Partial<CatRecord>): CatRecord {
  return {
    id: 1,
    catId: 1,
    type: 'water',
    amount: 0,
    unit: '',
    note: null,
    occurredAt: new Date().toISOString(),
    updatedAt: null,
    ...overrides,
  }
}

const meta = {
  title: 'Record/RecordFeedingSheet',
  component: RecordFeedingSheet,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '是否顯示。開啟時會依 mode 重填或清空欄位（副作用）。',
    },
    mode: {
      control: 'radio',
      options: ['add', 'edit'],
      description: '新增或編輯模式，決定標題與欄位初始值。',
    },
    type: {
      control: 'radio',
      options: ['water', 'food'],
      description: '新增模式下會顯示可切去 StartFeedingSheet 的 pill。',
    },
    catName: {
      control: 'text',
      description: '顯示在標題裡的貓咪名字。',
    },
    record: {
      control: 'object',
      description: 'edit 模式下用來預填數值、時間、備註的原始紀錄。',
    },
    saving: {
      control: 'boolean',
      description: '儲存中時按鈕文字改為「儲存中…」且 disabled。',
    },
    initialAmount: {
      control: 'text',
      description: 'add 模式下的初始金額。從 StartFeedingSheet 切換 pill 過來時，由呼叫端帶入延續輸入的量。',
    },
    cancel: { action: 'cancel' },
    save: { action: 'save' },
    'switch-to-feeding': { action: 'switch-to-feeding' },
  },
} satisfies Meta<typeof RecordFeedingSheet>

export default meta

type Story = StoryObj<typeof meta>

export const AddWater: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'water',
    catName: '橘子',
  },
}

export const AddFood: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'food',
    catName: '橘子',
  },
}

export const EditWater: Story = {
  args: {
    open: true,
    mode: 'edit',
    type: 'water',
    catName: '橘子',
    record: makeRecord({
      type: 'water',
      amount: 45,
      unit: 'ml',
      note: '換了新的水碗',
      occurredAt: '2026-08-19T02:30:00.000Z',
    }),
  },
}

export const Saving: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'water',
    catName: '橘子',
    saving: true,
  },
}

// 快速備註 tag 是元件內部直接讀 localStorage（src/composables/useQuickNotes.ts），
// 不是 prop，所以要在渲染前先塞好資料才看得到 tag。
// key 格式（'cuterCatTiger:quickNotes:{type}'）跟該 composable 內部的 STORAGE_PREFIX 一致，
// 因為該檔案沒有對外匯出 key 產生函式，這裡只能照抄格式；composable 若改了 key 格式，這裡要同步改。
function seedQuickNotes(type: string, entries: Array<{ text: string; count: number }>) {
  const key = `cuterCatTiger:quickNotes:${type}`
  const now = Date.now()
  window.localStorage.setItem(
    key,
    JSON.stringify(entries.map((e, i) => ({ ...e, lastUsedAt: now - i * 1000 }))),
  )
}

export const AddWaterWithQuickNotes: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'water',
    catName: '橘子',
  },
  decorators: [
    (story) => {
      seedQuickNotes('water', [
        { text: '加水', count: 6 },
        { text: '湯罐加水', count: 4 },
        { text: '換新的水碗', count: 2 },
      ])
      return { components: { story }, template: '<story />' }
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          '模擬使用者已經用過幾次類似備註後，計算機底盤內（數量／備註列下方）會出現的快速備註 tag（藥丸狀，點擊後直接取代備註內容、選中時實色填滿）。用滿 2 次以上的文字才會出現，最多顯示 8 個。',
      },
    },
  },
}

export const AddFoodWithQuickNotes: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'food',
    catName: '橘子',
  },
  decorators: [
    (story) => {
      seedQuickNotes('food', [
        { text: '換新的飼料', count: 5 },
        { text: '偏食，只吃一半', count: 3 },
        { text: '混罐頭一起吃', count: 2 },
      ])
      return { components: { story }, template: '<story />' }
    },
  ],
  parameters: {
    docs: {
      description: {
        story: '飼料類型的快速備註 tag 選中時填滿的顏色會跟著換成 --food（跟「儲存」按鈕的 food 樣式一致）。',
      },
    },
  },
}
