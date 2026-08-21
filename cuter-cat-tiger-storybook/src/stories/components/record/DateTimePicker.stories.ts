import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import DateTimePicker from '../../../../../cuter-cat-tiger/src/components/record/DateTimePicker.vue'

const meta = {
  title: 'Record/DateTimePicker',
  component: DateTimePicker,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: 'text',
      description:
        "目前的日期時間，格式為 'YYYY-MM-DDTHH:mm'（跟 utils/date.ts 的 datetime-local 字串一致，UTC+8 牆上時鐘時間，不含時區資訊）。這裡只作為這個 story 的初始值。",
    },
  },
  // 展開/收合是元件內部自己管理的狀態（不是 prop），所以這裡用本地 ref 包一層 v-model，
  // 讓這個 story 可以直接點擊 summary 列展開，操作日曆翻頁、選日期、改時間。
  render: (args) => ({
    components: { DateTimePicker },
    setup() {
      const value = ref(args.modelValue)
      return { value }
    },
    template: `
      <div style="max-width: 320px; margin: 0 auto;">
        <DateTimePicker v-model="value" />
      </div>
    `,
  }),
} satisfies Meta<typeof DateTimePicker>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    modelValue: '2026-08-21T14:30',
  },
  parameters: {
    docs: {
      description: {
        story:
          '點擊上方的日期時間摘要列可以展開／摺疊日曆。展開後可以翻頁切換月份、點日期選取、用「現在」快速跳回今天此刻，下方的時間欄位可以直接改時分。',
      },
    },
  },
}

export const EarlyMonth: Story = {
  args: {
    modelValue: '2026-03-01T08:00',
  },
  parameters: {
    docs: {
      description: {
        story: '月初的日子（3/1）會出現在該週的中間，前後補上上個月／下個月的灰階日期方便對齊星期。',
      },
    },
  },
}
