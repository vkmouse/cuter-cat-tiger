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
            這裡放展開後才顯示的內容，DateTimePicker（日曆＋時間）跟 RecordFormSheet 裡的
            CalculatorPad 都是用這個元件包起來，維持一致的收合互動與樣式。
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
