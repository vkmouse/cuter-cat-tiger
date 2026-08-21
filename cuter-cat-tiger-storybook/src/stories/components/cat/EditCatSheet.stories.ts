import type { Meta, StoryObj } from '@storybook/vue3-vite'

import EditCatSheet from '../../../../../cuter-cat-tiger/src/components/cat/EditCatSheet.vue'
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

const meta = {
  title: 'Cat/EditCatSheet',
  component: EditCatSheet,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '是否顯示。開啟時會用 cat 的當前資料重新填入欄位並 focus input（副作用）。',
    },
    cat: {
      control: 'object',
      description: '要編輯的貓咪，null 時開啟也不會填入任何值。',
    },
    saving: {
      control: 'boolean',
      description: '儲存中時按鈕文字改為「儲存中…」且 disabled。',
    },
    cancel: { action: 'cancel' },
    save: { action: 'save' },
  },
} satisfies Meta<typeof EditCatSheet>

export default meta

type Story = StoryObj<typeof meta>

export const Open: Story = {
  args: {
    open: true,
    cat: makeCat(),
  },
}

export const Saving: Story = {
  args: {
    open: true,
    cat: makeCat(),
    saving: true,
  },
}

export const NoCat: Story = {
  args: {
    open: true,
    cat: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'cat 為 null 時（例如尚未選定要編輯的貓咪），欄位全部清空。',
      },
    },
  },
}

export const Closed: Story = {
  args: {
    open: false,
    cat: makeCat(),
  },
}
