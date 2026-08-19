import type { Meta, StoryObj } from '@storybook/vue3-vite'

import RecordTypeIcon from '../../../cuter-cat-tiger/src/components/record/RecordTypeIcon.vue'

const meta = {
  title: 'Record/RecordTypeIcon',
  component: RecordTypeIcon,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['water', 'food', 'pee', 'poop'],
      description: '紀錄類型，決定顯示哪個圖示。',
    },
    size: {
      control: 'number',
      description: '圖示寬高（px），預設 16。',
    },
  },
} satisfies Meta<typeof RecordTypeIcon>

export default meta

type Story = StoryObj<typeof meta>

export const Water: Story = {
  args: { type: 'water' },
}

export const Food: Story = {
  args: { type: 'food' },
}

export const Pee: Story = {
  args: { type: 'pee' },
}

export const Poop: Story = {
  args: { type: 'poop' },
}

export const Large: Story = {
  args: { type: 'water', size: 32 },
}
