import type { Meta, StoryObj } from '@storybook/vue3-vite'

import DateNav from '../../../cuter-cat-tiger/src/components/record/DateNav.vue'

const meta = {
  title: 'Record/DateNav',
  component: DateNav,
  tags: ['autodocs'],
  argTypes: {
    date: {
      control: 'text',
      description: '日期 key，格式為 YYYY-MM-DD。',
    },
    prevDay: { action: 'prevDay' },
    nextDay: { action: 'nextDay' },
    openOverview: { action: 'openOverview' },
  },
} satisfies Meta<typeof DateNav>

export default meta

type Story = StoryObj<typeof meta>

export const Today: Story = {
  args: {
    date: new Date().toISOString().slice(0, 10),
  },
}

export const SpecificDate: Story = {
  args: {
    date: '2026-08-19',
  },
}
