import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ExpandableField from '../../../../../cuter-cat-tiger/src/components/ui/ExpandableField.vue'

const meta = {
  title: 'UI/ExpandableField',
  component: ExpandableField,
  tags: ['autodocs'],
  argTypes: {
    expanded: {
      control: 'boolean',
      description: '是否展開。點擊整個 summary 列會 emit update:expanded 切換。',
    },
    'onUpdate:expanded': { action: 'update:expanded' },
  },
  render: (args) => ({
    components: { ExpandableField },
    setup() {
      return { args }
    },
    template: `
      <div style="max-width: 320px; margin: 0 auto;">
        <ExpandableField v-bind="args">
          <template #summary>
            <span style="font-weight:600;">點我展開／摺疊</span>
          </template>
          <p style="margin:0;font-size:0.85rem;color:var(--ink-soft);">
            這裡放展開後才顯示的內容。DateTimePicker（日曆＋時間）是用這個元件包起來的，
            再透過 CalculatorPad 的 #datetime slot 顯示在計算機底盤裡；CalculatorPad 本身不再
            用 ExpandableField 包起來（現在整塊面板都固定展開）。
          </p>
        </ExpandableField>
      </div>
    `,
  }),
} satisfies Meta<typeof ExpandableField>

export default meta

type Story = StoryObj<typeof meta>

export const Collapsed: Story = {
  args: {
    expanded: false,
  },
}

export const Expanded: Story = {
  args: {
    expanded: true,
  },
}
