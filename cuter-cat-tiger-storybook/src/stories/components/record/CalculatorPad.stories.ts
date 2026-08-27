import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import CalculatorPad from '../../../../../cuter-cat-tiger/src/components/record/CalculatorPad.vue'
import DateTimePicker from '../../../../../cuter-cat-tiger/src/components/record/DateTimePicker.vue'

const meta = {
  title: 'Record/CalculatorPad',
  component: CalculatorPad,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: 'text',
      description: '目前顯示的數量字串（v-model），只作為這個 story 的初始值。',
    },
    note: {
      control: 'text',
      description: '備註文字（v-model:note），跟數量顯示在同一個白色圓角列裡（無圖示）。',
    },
    type: {
      control: 'radio',
      options: ['water', 'food'],
      description: '決定強調色：water 對應 --water，food 對應 --food。',
    },
    unit: {
      control: 'text',
      description: '顯示在數字後方的單位文字，例如 ml / g。',
    },
    saving: {
      control: 'boolean',
      description: '儲存中時所有按鍵（含確定鍵）都會 disabled。',
    },
    quickNotes: {
      control: 'object',
      description: '快速備註文字陣列，會渲染成 pill 列表；點擊直接「取代」備註（不是附加）。',
    },
    notePlaceholder: {
      control: 'text',
      description: '備註 input 的 placeholder。',
    },
  },
  // 元件本身是 v-model + pending operator 的內部狀態機（見元件內註解），
  // 用預設的 args 綁定沒辦法反映按鍵後的畫面變化，所以這裡用本地 ref 包一層，
  // 讓這個 story 可以直接在 Storybook 畫面上點按鍵盤操作、看到真的計算過程。
  render: (args) => ({
    components: { CalculatorPad },
    setup() {
      const amount = ref(args.modelValue)
      const note = ref(args.note ?? '')
      return { args, amount, note }
    },
    template: `
      <div style="max-width: 320px; margin: 0 auto;">
        <CalculatorPad
          v-model="amount"
          v-model:note="note"
          :type="args.type"
          :unit="args.unit"
          :saving="args.saving"
          :quick-notes="args.quickNotes"
          :note-placeholder="args.notePlaceholder"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof CalculatorPad>

export default meta

type Story = StoryObj<typeof meta>

export const WaterEmpty: Story = {
  args: {
    modelValue: '',
    note: '',
    type: 'water',
    unit: 'ml',
  },
  parameters: {
    docs: {
      description: {
        story:
          '初始空白狀態；輸入完整算式（運算子 + 第二個數字都有）後「=」才會啟用，只負責算出結果，不負責儲存紀錄，儲存由外層表單最下面固定的「儲存」按鈕處理。想看錯誤訊息可以試試「10 − 20 =」（結果為負數會被擋下來）。',
      },
    },
  },
}

export const WaterWithValue: Story = {
  args: {
    modelValue: '45',
    note: '',
    type: 'water',
    unit: 'ml',
  },
}

export const Food: Story = {
  args: {
    modelValue: '30',
    note: '',
    type: 'food',
    unit: 'g',
  },
  parameters: {
    docs: {
      description: {
        story: '飼料類型的強調色改用 --food，跟外層 Sheet 的「儲存」按鈕 food 樣式一致。',
      },
    },
  },
}

export const Saving: Story = {
  args: {
    modelValue: '45',
    note: '',
    type: 'water',
    unit: 'ml',
    saving: true,
  },
  parameters: {
    docs: {
      description: {
        story: '儲存中時所有按鍵都 disabled，確定鍵文字變成「儲存中…」（saving 為 true 且沒有算式時的顯示規則跟平常一樣，仍是「確定」）。',
      },
    },
  },
}

export const WithQuickNotes: Story = {
  args: {
    modelValue: '0',
    note: '',
    type: 'water',
    unit: 'ml',
    quickNotes: ['加水', '湯罐加水', '換新的水碗'],
  },
  parameters: {
    docs: {
      description: {
        story:
          '快速備註現在收在計算機底盤裡（數量／備註列下方），pill 底色改成跟數字鍵一樣的白色，避免跟底盤同色糊在一起。點擊是「取代」備註，不是附加。',
      },
    },
  },
}

export const WithDateTimeSlot: Story = {
  args: {
    modelValue: '0',
    note: '',
    type: 'water',
    unit: 'ml',
  },
  render: (args) => ({
    components: { CalculatorPad, DateTimePicker },
    setup() {
      const amount = ref(args.modelValue)
      const note = ref(args.note ?? '')
      const timeValue = ref('2026-08-27T10:43')
      return { args, amount, note, timeValue }
    },
    template: `
      <div style="max-width: 320px; margin: 0 auto;">
        <CalculatorPad
          v-model="amount"
          v-model:note="note"
          :type="args.type"
          :unit="args.unit"
          :saving="args.saving"
        >
          <template #datetime>
            <DateTimePicker v-model="timeValue" />
          </template>
        </CalculatorPad>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '#datetime slot 只負責呈現位置，狀態與互動邏輯完全在傳進來的 DateTimePicker 裡（這裡用本地 ref 模擬 RecordFeedingSheet/CompleteFeedingSheet 的用法）。CalculatorPad 用 :deep() 把裡面的 ExpandableField 覆寫成白色圓角 pill。',
      },
    },
  },
}

export const WithGivenAmountSlot: Story = {
  args: {
    modelValue: '0',
    note: '',
    type: 'water',
    unit: 'ml',
  },
  render: (args) => ({
    components: { CalculatorPad },
    setup() {
      const amount = ref(args.modelValue)
      const note = ref(args.note ?? '')
      return { args, amount, note }
    },
    template: `
      <div style="max-width: 320px; margin: 0 auto;">
        <CalculatorPad
          v-model="amount"
          v-model:note="note"
          :type="args.type"
          :unit="args.unit"
          :saving="args.saving"
        >
          <template #given-amount>
            <span class="given-amount-label">給予量</span>
            <span class="given-amount-value">50 ml</span>
          </template>
        </CalculatorPad>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '#given-amount slot 只有 CompleteFeedingSheet 會用到：唯讀顯示「這次給了多少」。CalculatorPad 用 :deep() 抓 .given-amount-label / .given-amount-value 這兩個 class 名稱套樣式，呼叫端只要照這個命名放內容即可。',
      },
    },
  },
}

export const CompleteFeedingLayout: Story = {
  args: {
    modelValue: '0',
    note: '',
    type: 'water',
    unit: 'ml',
    quickNotes: ['中途加過水', '換了新的水碗'],
  },
  render: (args) => ({
    components: { CalculatorPad, DateTimePicker },
    setup() {
      const amount = ref(args.modelValue)
      const note = ref(args.note ?? '')
      const timeValue = ref('2026-08-27T12:07')
      return { args, amount, note, timeValue }
    },
    template: `
      <div style="max-width: 320px; margin: 0 auto;">
        <CalculatorPad
          v-model="amount"
          v-model:note="note"
          :type="args.type"
          :unit="args.unit"
          :saving="args.saving"
          :quick-notes="args.quickNotes"
        >
          <template #given-amount>
            <span class="given-amount-label">給予量</span>
            <span class="given-amount-value">50 ml</span>
          </template>
          <template #datetime>
            <DateTimePicker v-model="timeValue" />
          </template>
        </CalculatorPad>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: '三個 slot／props 全部一起用時的完整樣子，對應 CompleteFeedingSheet 實際的使用方式。',
      },
    },
  },
}
