import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BatchCompleteFeedingSheet from '../../../../../cuter-cat-tiger/src/components/record/BatchCompleteFeedingSheet.vue'
import type { Cat, FeedingSession } from '../../../../../cuter-cat-tiger/src/types'

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

function makeSession(overrides: Partial<FeedingSession> = {}): FeedingSession {
  return {
    id: 1,
    catId: 1,
    type: 'water',
    givenAmount: 50,
    unit: 'ml',
    note: null,
    givenAt: new Date().toISOString(),
    updatedAt: null,
    ...overrides,
  }
}

const TWO_CATS: Cat[] = [makeCat({ id: 1, name: '橘子' }), makeCat({ id: 2, name: '小黑' })]

const meta = {
  title: 'Record/BatchCompleteFeedingSheet',
  component: BatchCompleteFeedingSheet,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '是否顯示。開啟時依 sessions 重建清單（剩餘量歸零、全部勾選）、選中第一列，並把共用完成時間重設為現在（副作用）。',
    },
    sessions: {
      control: 'object',
      description: '所有貓咪目前進行中的餵食，通常來自 useAllFeedingSessions（跨貓咪查詢）。',
    },
    cats: {
      control: 'object',
      description: '用來把 session.catId 對應回貓咪名字，顯示在每一列上。',
    },
    saving: {
      control: 'boolean',
      description: '儲存中時按鈕文字改為「儲存中…」且 disabled。',
    },
    cancel: { action: 'cancel' },
    save: { action: 'save' },
  },
} satisfies Meta<typeof BatchCompleteFeedingSheet>

export default meta

type Story = StoryObj<typeof meta>

export const TwoPending: Story = {
  args: {
    open: true,
    cats: TWO_CATS,
    sessions: [
      makeSession({ id: 1, catId: 1, type: 'water', givenAmount: 50, unit: 'ml' }),
      makeSession({ id: 2, catId: 2, type: 'food', givenAmount: 35, unit: 'g' }),
    ],
  },
}

export const SamesCatBothTypes: Story = {
  args: {
    open: true,
    cats: TWO_CATS,
    sessions: [
      makeSession({ id: 1, catId: 1, type: 'water', givenAmount: 60, unit: 'ml' }),
      makeSession({ id: 2, catId: 1, type: 'food', givenAmount: 35, unit: 'g' }),
    ],
  },
}

export const SinglePending: Story = {
  args: {
    open: true,
    cats: TWO_CATS,
    sessions: [makeSession({ id: 1, catId: 1, type: 'water', givenAmount: 50, unit: 'ml' })],
  },
}

export const Saving: Story = {
  args: {
    open: true,
    cats: TWO_CATS,
    sessions: [makeSession({ id: 1, catId: 1, type: 'water', givenAmount: 50, unit: 'ml' })],
    saving: true,
  },
}

export const NoPending: Story = {
  args: {
    open: true,
    cats: TWO_CATS,
    sessions: [],
  },
  parameters: {
    docs: {
      description: {
        story: '沒有進行中的餵食時清單顯示提示文字，CalculatorPad 跟底部的儲存/取消列都不會渲染。',
      },
    },
  },
}
