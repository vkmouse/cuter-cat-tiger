import type { Meta, StoryObj } from '@storybook/vue3-vite'

import RecordFormSheet from '../../../cuter-cat-tiger/src/components/record/RecordFormSheet.vue'
import type { CatRecord } from '../../../cuter-cat-tiger/src/types'

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
  title: 'Record/RecordFormSheet',
  component: RecordFormSheet,
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
      options: ['water', 'food', 'pee', 'poop'],
      description: 'water/food 會顯示「數量」欄位；pee/poop 不量化，不顯示數量欄位。',
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
    cancel: { action: 'cancel' },
    save: { action: 'save' },
  },
} satisfies Meta<typeof RecordFormSheet>

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
