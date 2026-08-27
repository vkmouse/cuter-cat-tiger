import type { Meta, StoryObj } from '@storybook/vue3-vite'

import RecordLitterFormSheet from '../../../../../cuter-cat-tiger/src/components/record/RecordLitterFormSheet.vue'
import type { CatRecord } from '../../../../../cuter-cat-tiger/src/types'

function makeRecord(overrides: Partial<CatRecord>): CatRecord {
  return {
    id: 1,
    catId: 1,
    type: 'pee',
    amount: 0,
    unit: '',
    note: null,
    occurredAt: new Date().toISOString(),
    updatedAt: null,
    ...overrides,
  }
}

const meta = {
  title: 'Record/RecordLitterFormSheet',
  component: RecordLitterFormSheet,
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
      options: ['pee', 'poop'],
      description: '只有一般紀錄，沒有數量、沒有切去其他 sheet 的 pill。',
    },
    catName: {
      control: 'text',
      description: '顯示在標題裡的貓咪名字。',
    },
    record: {
      control: 'object',
      description: 'edit 模式下用來預填時間、備註的原始紀錄。',
    },
    saving: {
      control: 'boolean',
      description: '儲存中時按鈕文字改為「儲存中…」且 disabled。',
    },
    cancel: { action: 'cancel' },
    save: { action: 'save' },
  },
} satisfies Meta<typeof RecordLitterFormSheet>

export default meta

type Story = StoryObj<typeof meta>

export const AddPee: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'pee',
    catName: '橘子',
  },
}

export const AddPoop: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'poop',
    catName: '橘子',
  },
}

export const EditPee: Story = {
  args: {
    open: true,
    mode: 'edit',
    type: 'pee',
    catName: '橘子',
    record: makeRecord({
      type: 'pee',
      note: '尿墊換過了',
      occurredAt: '2026-08-19T02:30:00.000Z',
    }),
  },
}

export const Saving: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'pee',
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

export const AddPeeWithQuickNotes: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'pee',
    catName: '橘子',
  },
  decorators: [
    (story) => {
      seedQuickNotes('pee', [
        { text: '尿墊換過了', count: 6 },
        { text: '量偏少', count: 4 },
        { text: '有點血尿，觀察中', count: 2 },
      ])
      return { components: { story }, template: '<story />' }
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          '模擬使用者已經用過幾次類似備註後，備註欄位下方會出現的快速備註 tag（藥丸狀，點擊後直接取代備註內容、選中時實色填滿）。用滿 2 次以上的文字才會出現，最多顯示 8 個。',
      },
    },
  },
}

export const AddPoopWithQuickNotes: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'poop',
    catName: '橘子',
  },
  decorators: [
    (story) => {
      seedQuickNotes('poop', [
        { text: '軟便，觀察看看', count: 5 },
        { text: '量偏少', count: 3 },
        { text: '正常', count: 2 },
      ])
      return { components: { story }, template: '<story />' }
    },
  ],
  parameters: {
    docs: {
      description: {
        story: '大便類型的快速備註 tag 一樣是實色填滿，跟尿尿共用同一套 litter 樣式。',
      },
    },
  },
}
