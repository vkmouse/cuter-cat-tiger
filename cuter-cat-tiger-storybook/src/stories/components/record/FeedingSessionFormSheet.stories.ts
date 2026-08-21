import type { Meta, StoryObj } from '@storybook/vue3-vite'

import FeedingSessionFormSheet from '../../../../../cuter-cat-tiger/src/components/record/FeedingSessionFormSheet.vue'
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
  title: 'Record/FeedingSessionFormSheet',
  component: FeedingSessionFormSheet,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '是否顯示。開啟時會依 mode 重填或清空「這次給多少」欄位（副作用）。',
    },
    mode: {
      control: 'radio',
      options: ['start', 'edit'],
      description: 'start＝開始一段新的餵食；edit＝修改一段已經在進行中的餵食給的量。',
    },
    type: {
      control: 'radio',
      options: ['water', 'food'],
      description: '決定標題文字、單位（ml/g）與計算機面板的配色。',
    },
    catName: {
      control: 'text',
      description: '顯示在標題裡的貓咪名字。',
    },
    session: {
      control: 'object',
      description: 'edit 模式下用來預填「這次給多少」的原始 session。',
    },
    saving: {
      control: 'boolean',
      description: '儲存中時會傳給 CalculatorPad，停用確認鍵。',
    },
    cancel: { action: 'cancel' },
    save: { action: 'save' },
  },
} satisfies Meta<typeof FeedingSessionFormSheet>

export default meta

type Story = StoryObj<typeof meta>

export const StartWater: Story = {
  args: {
    open: true,
    mode: 'start',
    type: 'water',
    catName: '橘子',
  },
}

export const StartFood: Story = {
  args: {
    open: true,
    mode: 'start',
    type: 'food',
    catName: '橘子',
  },
}

export const EditWater: Story = {
  args: {
    open: true,
    mode: 'edit',
    type: 'water',
    catName: '橘子',
    session: makeSession({ type: 'water', givenAmount: 45, unit: 'ml' }),
  },
}

export const Saving: Story = {
  args: {
    open: true,
    mode: 'start',
    type: 'water',
    catName: '橘子',
    saving: true,
  },
}
