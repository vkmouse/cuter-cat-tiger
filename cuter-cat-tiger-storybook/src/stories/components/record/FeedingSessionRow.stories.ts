import type { Meta, StoryObj } from '@storybook/vue3-vite'

import FeedingSessionRow from '../../../../../cuter-cat-tiger/src/components/record/FeedingSessionRow.vue'
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

const meta = {
  title: 'Record/FeedingSessionRow',
  component: FeedingSessionRow,
  tags: ['autodocs'],
  argTypes: {
    session: {
      control: 'object',
      description: '進行中的餵食 session，type 決定圖示、顏色與「完成」按鈕樣式。',
    },
    complete: { action: 'complete' },
    edit: { action: 'edit' },
    cancel: { action: 'cancel' },
  },
} satisfies Meta<typeof FeedingSessionRow>

export default meta

type Story = StoryObj<typeof meta>

export const Water: Story = {
  args: {
    session: makeSession({ type: 'water', givenAmount: 45, unit: 'ml' }),
  },
}

export const Food: Story = {
  args: {
    session: makeSession({ type: 'food', givenAmount: 30, unit: 'g' }),
  },
}

export const GivenLongAgo: Story = {
  args: {
    session: makeSession({
      type: 'water',
      givenAmount: 50,
      unit: 'ml',
      givenAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    }),
  },
  parameters: {
    docs: {
      description: {
        story: '「已給多久」的標籤（formatSinceLabel）會依 givenAt 與現在的時間差計算，這裡模擬三小時前給的狀況。',
      },
    },
  },
}
