import type { Meta, StoryObj } from '@storybook/vue3-vite'

import RecordRow from '../../../cuter-cat-tiger/src/components/record/RecordRow.vue'
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
  title: 'Record/RecordRow',
  component: RecordRow,
  tags: ['autodocs'],
  argTypes: {
    record: {
      control: 'object',
      description: '單筆紀錄，type 決定圖示、顏色與右側顯示內容。',
    },
    edit: { action: 'edit' },
    remove: { action: 'remove' },
  },
} satisfies Meta<typeof RecordRow>

export default meta

type Story = StoryObj<typeof meta>

export const Water: Story = {
  args: {
    record: makeRecord({ type: 'water', amount: 45, unit: 'ml' }),
  },
}

export const Food: Story = {
  args: {
    record: makeRecord({ type: 'food', amount: 30, unit: 'g' }),
  },
}

export const Pee: Story = {
  args: {
    record: makeRecord({ type: 'pee', amount: 0, unit: '' }),
  },
}

export const Poop: Story = {
  args: {
    record: makeRecord({ type: 'poop', amount: 0, unit: '' }),
  },
}

export const WithNote: Story = {
  args: {
    record: makeRecord({
      type: 'food',
      amount: 25,
      unit: 'g',
      note: '換了新口味，吃得比平常少一點',
    }),
  },
}
