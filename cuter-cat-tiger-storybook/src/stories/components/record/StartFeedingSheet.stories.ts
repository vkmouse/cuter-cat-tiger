import type { Meta, StoryObj } from '@storybook/vue3-vite'

import StartFeedingSheet from '../../../../../cuter-cat-tiger/src/components/record/StartFeedingSheet.vue'
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
  title: 'Record/StartFeedingSheet',
  component: StartFeedingSheet,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '是否顯示。開啟時會依 mode 重填或清空給的量（副作用）。',
    },
    mode: {
      control: 'radio',
      options: ['add', 'edit'],
      description: '新增（開始餵）或編輯（修改給的量）先給後測 session。',
    },
    type: {
      control: 'radio',
      options: ['water', 'food'],
      description: '先給後測只適用水/飼料兩種類型。',
    },
    catName: {
      control: 'text',
      description: '顯示在標題裡的貓咪名字。',
    },
    feedingSession: {
      control: 'object',
      description: 'edit 模式下用來預填給的量的原始 session。',
    },
    saving: {
      control: 'boolean',
      description: '儲存中時按鈕文字改為「儲存中…」且 disabled。',
    },
    cancel: { action: 'cancel' },
    save: { action: 'save' },
    'switch-to-record': { action: 'switch-to-record' },
  },
} satisfies Meta<typeof StartFeedingSheet>

export default meta

type Story = StoryObj<typeof meta>

export const StartWater: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'water',
    catName: '橘子',
  },
}

export const StartFood: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'food',
    catName: '橘子',
  },
}

export const EditGivenAmount: Story = {
  args: {
    open: true,
    mode: 'edit',
    type: 'water',
    catName: '橘子',
    feedingSession: makeSession({ type: 'water', givenAmount: 50, unit: 'ml' }),
  },
}

export const Saving: Story = {
  args: {
    open: true,
    mode: 'add',
    type: 'water',
    catName: '橘子',
    saving: true,
  },
}
