import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AddCatSheet from '../../../../../cuter-cat-tiger/src/components/cat/AddCatSheet.vue'

const meta = {
  title: 'Cat/AddCatSheet',
  component: AddCatSheet,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '是否顯示。開啟時內部會自動清空輸入欄位並 focus input（副作用）。',
    },
    saving: {
      control: 'boolean',
      description: '新增中時按鈕文字改為「新增中…」且 disabled。',
    },
    cancel: { action: 'cancel' },
    save: { action: 'save' },
  },
} satisfies Meta<typeof AddCatSheet>

export default meta

type Story = StoryObj<typeof meta>

export const Open: Story = {
  args: {
    open: true,
  },
}

export const Saving: Story = {
  args: {
    open: true,
    saving: true,
  },
}

export const Closed: Story = {
  args: {
    open: false,
  },
}
