import type { Meta, StoryObj } from '@storybook/vue3-vite'

import CompleteFeedingSheet from '../../../../../cuter-cat-tiger/src/components/record/CompleteFeedingSheet.vue'
import type { FeedingSession } from '../../../../../cuter-cat-tiger/src/types'

function makeSession(overrides: Partial<FeedingSession> = {}): FeedingSession {
  return {
    id: 1,
    catId: 1,
    type: 'water',
    givenAmount: 50,
    unit: 'ml',
    givenAt: new Date().toISOString(),
    updatedAt: null,
    ...overrides,
  }
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

const meta = {
  title: 'Record/CompleteFeedingSheet',
  component: CompleteFeedingSheet,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '是否顯示。開啟時會清空剩下多少／備註，並把量測時間重設為現在（副作用）。',
    },
    catName: {
      control: 'text',
      description: '顯示在標題裡的貓咪名字。',
    },
    session: {
      control: 'object',
      description: '要完成量測的 session，提供「這次給了多少」的情境文字與剩餘量計算機的 type/unit；為 null 時內容區不渲染。',
    },
    saving: {
      control: 'boolean',
      description: '儲存中時會傳給 CalculatorPad；整筆紀錄的儲存由 Sheet 底部的「儲存」按鈕負責。',
    },
    cancel: { action: 'cancel' },
    save: { action: 'save' },
  },
} satisfies Meta<typeof CompleteFeedingSheet>

export default meta

type Story = StoryObj<typeof meta>

export const Water: Story = {
  args: {
    open: true,
    catName: '橘子',
    session: makeSession({ type: 'water', givenAmount: 50, unit: 'ml' }),
  },
}

export const Food: Story = {
  args: {
    open: true,
    catName: '橘子',
    session: makeSession({ type: 'food', givenAmount: 30, unit: 'g' }),
  },
}

export const Saving: Story = {
  args: {
    open: true,
    catName: '橘子',
    session: makeSession({ type: 'water', givenAmount: 50, unit: 'ml' }),
    saving: true,
  },
}

export const NoSession: Story = {
  args: {
    open: true,
    catName: '橘子',
    session: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'session 為 null 時（v-if="session"），Sheet 只顯示外框標題，內容區完全不渲染。',
      },
    },
  },
}

export const WithQuickNotes: Story = {
  args: {
    open: true,
    catName: '橘子',
    session: makeSession({ type: 'water', givenAmount: 50, unit: 'ml' }),
  },
  decorators: [
    (story) => {
      seedQuickNotes('water', [
        { text: '中途加過水', count: 6 },
        { text: '換了新的水碗', count: 3 },
      ])
      return { components: { story }, template: '<story />' }
    },
  ],
  parameters: {
    docs: {
      description: {
        story: '模擬使用者已經用過幾次類似備註後，備註欄位下方會出現的快速備註 tag（點擊後直接取代備註內容）。',
      },
    },
  },
}
