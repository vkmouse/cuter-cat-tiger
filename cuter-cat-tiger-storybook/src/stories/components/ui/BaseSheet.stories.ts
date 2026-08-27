import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BaseSheet from '../../../../../cuter-cat-tiger/src/components/ui/BaseSheet.vue'

const meta = {
  title: 'UI/BaseSheet',
  component: BaseSheet,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '是否顯示 backdrop 與 panel（滑入/滑出動畫）。',
    },
    title: {
      control: 'text',
      description: 'Sheet 標題，對應 h2 與 aria-labelledby。',
    },
    elevated: {
      control: 'boolean',
      description: '疊在其他 Sheet 之上時使用，提高 z-index。',
    },
    cancel: { action: 'cancel' },
  },
  render: (args) => ({
    components: { BaseSheet },
    setup() {
      return { args }
    },
    template: `
      <BaseSheet v-bind="args">
        <p style="font-size:0.88rem;color:var(--ink-soft);margin:0 0 18px;">
          這裡放各個 Sheet 自己的表單或內容（透過 default slot）。
        </p>
        <template #actions>
          <div class="sheet-actions">
            <button type="button" class="btn ghost" @click="args.cancel">取消</button>
            <button type="button" class="btn primary">確定</button>
          </div>
        </template>
      </BaseSheet>
    `,
  }),
} satisfies Meta<typeof BaseSheet>

export default meta

type Story = StoryObj<typeof meta>

export const Open: Story = {
  args: {
    open: true,
    title: '範例標題',
  },
}

export const Elevated: Story = {
  args: {
    open: true,
    title: '疊在最上層的 Sheet',
    elevated: true,
  },
}

export const MobileLongContent: Story = {
  args: {
    open: true,
    title: '手機長內容',
  },
  render: (args) => ({
    components: { BaseSheet },
    setup() {
      return { args }
    },
    template: `
      <BaseSheet v-bind="args">
        <div style="display:grid;gap:14px;">
          <p v-for="i in 10" :key="i" style="margin:0;padding:14px;border:1px solid var(--line);border-radius:10px;background:var(--paper);">
            長內容第 {{ i }} 段：在手機上，Sheet 內容會維持標題可見，只有內容區（.sheet-content）需要垂直滑動；
            透過 #actions slot 傳入的「取消／確定」永遠固定在 Sheet 最底部，不會被推到捲動內容下面。
          </p>
        </div>
        <template #actions>
          <div class="sheet-actions">
            <button type="button" class="btn ghost">取消</button>
            <button type="button" class="btn primary">確定</button>
          </div>
        </template>
      </BaseSheet>
    `,
  }),
}

export const Closed: Story = {
  args: {
    open: false,
    title: '範例標題',
  },
}
