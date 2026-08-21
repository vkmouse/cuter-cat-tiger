import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PendingFeedingList from '../../../../../cuter-cat-tiger/src/components/record/PendingFeedingList.vue'
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
  title: 'Record/PendingFeedingList',
  component: PendingFeedingList,
  tags: ['autodocs'],
  argTypes: {
    sessions: {
      control: 'object',
      description: '進行中的餵食 session 清單，空陣列時整個元件不渲染任何東西（含標題）。',
    },
    complete: { action: 'complete' },
    edit: { action: 'edit' },
    cancel: { action: 'cancel' },
  },
} satisfies Meta<typeof PendingFeedingList>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    sessions: [
      makeSession({
        id: 1,
        type: 'water',
        givenAmount: 45,
        unit: 'ml',
        givenAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      }),
      makeSession({
        id: 2,
        type: 'food',
        givenAmount: 30,
        unit: 'g',
        givenAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      }),
    ],
  },
}

export const Single: Story = {
  args: {
    sessions: [makeSession({ id: 1, type: 'water', givenAmount: 50, unit: 'ml' })],
  },
}

export const Empty: Story = {
  args: {
    sessions: [],
  },
  parameters: {
    docs: {
      description: {
        story: '沒有進行中的餵食時，元件靠 v-if 完全不渲染（連標題「進行中的餵食」都不會出現）。',
      },
    },
  },
}
