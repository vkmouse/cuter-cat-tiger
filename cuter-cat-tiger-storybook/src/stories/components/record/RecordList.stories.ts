import type { Meta, StoryObj } from '@storybook/vue3-vite'

import RecordList from '../../../../../cuter-cat-tiger/src/components/record/RecordList.vue'
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

const RECORDS: CatRecord[] = [
  makeRecord({
    id: 1,
    type: 'water',
    amount: 45,
    unit: 'ml',
    occurredAt: '2026-08-19T01:00:00.000Z',
  }),
  makeRecord({
    id: 2,
    type: 'food',
    amount: 30,
    unit: 'g',
    occurredAt: '2026-08-19T03:30:00.000Z',
  }),
  makeRecord({
    id: 3,
    type: 'pee',
    occurredAt: '2026-08-19T05:15:00.000Z',
  }),
  makeRecord({
    id: 4,
    type: 'poop',
    note: '便便偏軟，觀察看看',
    occurredAt: '2026-08-19T07:45:00.000Z',
  }),
]

const meta = {
  title: 'Record/RecordList',
  component: RecordList,
  tags: ['autodocs'],
  argTypes: {
    records: {
      control: 'object',
      description: '單日紀錄清單，元件內部會依 occurredAt 由新到舊排序後才顯示。',
    },
    loading: {
      control: 'boolean',
      description: '載入中時顯示「載入中…」，蓋過其他狀態。',
    },
    error: {
      control: 'text',
      description: '有錯誤訊息時顯示錯誤文字（優先度低於 loading）。',
    },
    edit: { action: 'edit' },
    remove: { action: 'remove' },
  },
} satisfies Meta<typeof RecordList>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // 刻意打亂順序放入，驗證元件會依時間由新到舊重新排序（poop 07:45 應排第一，water 01:00 排最後）
    records: RECORDS,
  },
}

export const Loading: Story = {
  args: {
    records: [],
    loading: true,
  },
}

export const Error: Story = {
  args: {
    records: [],
    error: '讀取紀錄失敗，請稍後再試一次。',
  },
}

export const Empty: Story = {
  args: {
    records: [],
  },
}
