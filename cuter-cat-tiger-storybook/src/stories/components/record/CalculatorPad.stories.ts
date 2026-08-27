import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import CalculatorPad from '../../../../../cuter-cat-tiger/src/components/record/CalculatorPad.vue'

const meta = {
  title: 'Record/CalculatorPad',
  component: CalculatorPad,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: 'text',
      description: '目前顯示的數量字串（v-model），只作為這個 story 的初始值。',
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
      description: '儲存中時所有按鍵（含確定鍵）都會 disabled，「=」會維持停用，避免在沒有完整算式時誤按。',
    },
  },
  // 元件本身是 v-model + pending operator 的內部狀態機（見元件內註解），
  // 用預設的 args 綁定沒辦法反映按鍵後的畫面變化，所以這裡用一個本地 ref 包一層，
  // 讓這個 story 可以直接在 Storybook 畫面上點按鍵盤操作、看到真的計算過程。
  render: (args) => ({
    components: { CalculatorPad },
    setup() {
      const amount = ref(args.modelValue)
      return { args, amount }
    },
    template: `
      <div style="max-width: 320px; margin: 0 auto;">
        <CalculatorPad
          v-model="amount"
          :type="args.type"
          :unit="args.unit"
          :saving="args.saving"
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
    type: 'water',
    unit: 'ml',
  },
  parameters: {
    docs: {
      description: {
        story:
          '初始空白狀態；輸入完整算式後「=」才會啟用，只負責算出結果，不負責儲存紀錄。儲存由外層表單最下面的「儲存」按鈕處理。想看錯誤訊息可以試試「10 − 20 =」（結果為負數會被擋下來）。',
      },
    },
  },
}

export const WaterWithValue: Story = {
  args: {
    modelValue: '45',
    type: 'water',
    unit: 'ml',
  },
}

export const Food: Story = {
  args: {
    modelValue: '30',
    type: 'food',
    unit: 'g',
  },
  parameters: {
    docs: {
      description: {
        story: '飼料類型的強調色改用 --food，跟 RecordFeedingSheet 的「儲存」按鈕 food 樣式一致。',
      },
    },
  },
}

export const Saving: Story = {
  args: {
    modelValue: '45',
    type: 'water',
    unit: 'ml',
    saving: true,
  },
  parameters: {
    docs: {
      description: {
        story: '儲存中時所有按鍵都 disabled，確定鍵文字變成「儲存中…」，避免使用者重複送出。',
      },
    },
  },
}
