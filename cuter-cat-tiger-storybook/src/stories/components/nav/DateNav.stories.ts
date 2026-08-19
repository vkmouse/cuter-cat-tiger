import type { Meta, StoryObj } from '@storybook/vue3-vite'

import DateNav from '../../../../../cuter-cat-tiger/src/components/nav/DateNav.vue'

const meta = {
  title: 'Nav/DateNav',
  component: DateNav,
  tags: ['autodocs'],
  argTypes: {
    date: {
      control: 'text',
      description: '日期 key，格式為 YYYY-MM-DD。',
    },
    prevDay: { action: 'prevDay' },
    nextDay: { action: 'nextDay' },
    openAllCatsStats: { action: 'openAllCatsStats' },
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
