import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ConfirmSheet from '../../../../../cuter-cat-tiger/src/components/ui/ConfirmSheet.vue'

const meta = {
  title: 'UI/ConfirmSheet',
  component: ConfirmSheet,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '是否顯示 backdrop 與 panel（透過 BaseSheet）。',
    },
    title: {
      control: 'text',
      description: 'Sheet 標題。',
    },
    message: {
      control: 'text',
      description: '說明文字，選填。',
    },
    confirmText: {
      control: 'text',
      description: '確認按鈕文字，預設「確定」。',
    },
    cancelText: {
      control: 'text',
      description: '取消按鈕文字，預設「取消」。',
    },
    danger: {
      control: 'boolean',
      description: '破壞性操作（例如刪除紀錄）時使用，確認按鈕改為紅色。',
    },
    saving: {
      control: 'boolean',
      description: '處理中時確認按鈕文字改為「處理中…」且 disabled。',
    },
    cancel: { action: 'cancel' },
    confirm: { action: 'confirm' },
  },
} satisfies Meta<typeof ConfirmSheet>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    open: true,
    title: '確定要離開嗎？',
    message: '尚未儲存的內容將會遺失。',
  },
}

export const Danger: Story = {
  args: {
    open: true,
    title: '刪除這筆紀錄？',
    message: '刪除後無法復原。',
    confirmText: '刪除',
    danger: true,
  },
}

export const Saving: Story = {
  args: {
    open: true,
    title: '刪除這筆紀錄？',
    message: '刪除後無法復原。',
    confirmText: '刪除',
    danger: true,
    saving: true,
  },
}
