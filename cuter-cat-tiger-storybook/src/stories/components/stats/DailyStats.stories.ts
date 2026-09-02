import type { Meta, StoryObj } from '@storybook/vue3-vite'

import DailyStats from '../../../../../cuter-cat-tiger/src/components/stats/DailyStats.vue'

const meta = {
  title: 'Stats/DailyStats',
  component: DailyStats,
  tags: ['autodocs'],
  argTypes: {
    waterMl: {
      control: 'number',
      description: '當日喝水量（ml）。',
    },
    foodG: {
      control: 'number',
      description: '當日飼料量（g）。',
    },
    peeCount: {
      control: 'number',
      description: '當日尿尿次數。',
    },
    poopCount: {
      control: 'number',
      description: '當日大便次數。',
    },
    loading: {
      control: 'boolean',
      description: '載入中時所有數字改顯示 —。',
    },
    disabled: {
      control: 'boolean',
      description: '沒有選取貓咪時鎖住卡片上的按鈕。',
    },
    'quick-record': { action: 'quick-record' },
    'start-feeding': { action: 'start-feeding' },
  },
} satisfies Meta<typeof DailyStats>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    waterMl: 320,
    foodG: 85,
    peeCount: 3,
    poopCount: 1,
  },
}

export const Empty: Story = {
  args: {
    waterMl: 0,
    foodG: 0,
    peeCount: 0,
    poopCount: 0,
  },
}

export const HighValues: Story = {
  args: {
    waterMl: 1280.5,
    foodG: 342.8,
    peeCount: 9,
    poopCount: 4,
  },
}

export const Loading: Story = {
  args: {
    waterMl: 0,
    foodG: 0,
    peeCount: 0,
    poopCount: 0,
    loading: true,
  },
}
