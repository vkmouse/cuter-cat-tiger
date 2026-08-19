import type { Meta, StoryObj } from '@storybook/vue3-vite'

import CatTabs from '../../../../../cuter-cat-tiger/src/components/cat/CatTabs.vue'
import type { Cat } from '../../../../../cuter-cat-tiger/src/types'

function makeCat(id: number, name: string): Cat {
  return {
    id,
    name,
    createdAt: new Date().toISOString(),
  }
}

const CATS: Cat[] = [
  makeCat(1, '橘子'),
  makeCat(2, '小黑'),
  makeCat(3, '奶油'),
]

const meta = {
  title: 'Cat/CatTabs',
  component: CatTabs,
  tags: ['autodocs'],
  argTypes: {
    cats: {
      control: 'object',
      description: '貓咪清單，依序顯示為分頁。',
    },
    activeCatId: {
      control: 'number',
      description: '目前選中的貓咪 id，對應分頁會顯示 active 樣式。',
    },
    select: { action: 'select' },
    addCat: { action: 'addCat' },
  },
} satisfies Meta<typeof CatTabs>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    cats: CATS,
    activeCatId: 1,
  },
}

export const SecondTabActive: Story = {
  args: {
    cats: CATS,
    activeCatId: 2,
  },
}

export const SingleCat: Story = {
  args: {
    cats: [makeCat(1, '橘子')],
    activeCatId: 1,
  },
}

export const Empty: Story = {
  args: {
    cats: [],
    activeCatId: null,
  },
}
