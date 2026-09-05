import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BatchFeedingBar from '../../../../../cuter-cat-tiger/src/components/record/BatchFeedingBar.vue'

const meta = {
  title: 'Record/BatchFeedingBar',
  component: BatchFeedingBar,
  tags: ['autodocs'],
  argTypes: {
    pendingCount: {
      control: 'number',
      description: '所有貓咪目前進行中的餵食總數。為 0 時「批次完成餵食」鈕會 disabled，且不顯示 badge。',
    },
    'start-batch': { action: 'start-batch' },
    'complete-batch': { action: 'complete-batch' },
  },
} satisfies Meta<typeof BatchFeedingBar>

export default meta

type Story = StoryObj<typeof meta>

export const NoPending: Story = {
  args: {
    pendingCount: 0,
  },
}

export const WithPending: Story = {
  args: {
    pendingCount: 3,
  },
}

export const ManyPending: Story = {
  args: {
    pendingCount: 12,
  },
}
