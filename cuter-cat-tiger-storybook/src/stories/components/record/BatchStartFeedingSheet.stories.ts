import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BatchStartFeedingSheet from '../../../../../cuter-cat-tiger/src/components/record/BatchStartFeedingSheet.vue'
import type { Cat } from '../../../../../cuter-cat-tiger/src/types'

function makeCat(overrides: Partial<Cat> = {}): Cat {
  return {
    id: 1,
    name: '橘子',
    targetWater: 200,
    targetFood: 60,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const TWO_CATS: Cat[] = [makeCat({ id: 1, name: '橘子' }), makeCat({ id: 2, name: '小黑' })]

const meta = {
  title: 'Record/BatchStartFeedingSheet',
  component: BatchStartFeedingSheet,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '是否顯示。開啟時會依 cats 重建清單（每隻貓水/飼料各一列，量歸零、全部勾選）並選中第一列（副作用）。',
    },
    cats: {
      control: 'object',
      description: '要攤成清單的貓咪；每隻貓會展開成「水」「飼料」兩列。',
    },
    saving: {
      control: 'boolean',
      description: '儲存中時按鈕文字改為「儲存中…」且 disabled。',
    },
    cancel: { action: 'cancel' },
    save: { action: 'save' },
  },
} satisfies Meta<typeof BatchStartFeedingSheet>

export default meta

type Story = StoryObj<typeof meta>

export const TwoCats: Story = {
  args: {
    open: true,
    cats: TWO_CATS,
  },
}

export const ThreeCats: Story = {
  args: {
    open: true,
    cats: [...TWO_CATS, makeCat({ id: 3, name: '奶油' })],
  },
}

export const SingleCat: Story = {
  args: {
    open: true,
    cats: [makeCat({ id: 1, name: '橘子' })],
  },
}

export const Saving: Story = {
  args: {
    open: true,
    cats: TWO_CATS,
    saving: true,
  },
}

export const NoCats: Story = {
  args: {
    open: true,
    cats: [],
  },
  parameters: {
    docs: {
      description: {
        story: '沒有貓咪時清單是空的，CalculatorPad 也不會渲染（v-if="selectedRow"），送出鈕維持 disabled。',
      },
    },
  },
}
