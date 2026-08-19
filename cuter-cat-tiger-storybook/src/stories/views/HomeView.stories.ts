import type { Meta, StoryObj } from '@storybook/vue3-vite'

import HomeView from './HomeView.vue'

// 這個 story 不對應單一元件，而是把 CatTabs / DateNav / DailyStats / RecordList /
// RecordFormSheet / AddCatSheet / ConfirmSheet / OverviewSheet 組裝成跟正式 app
// 的 views/HomeView.vue 一樣的畫面（見同資料夾的 HomeView.vue），資料是記憶體內的
// 假資料，可以真的點擊操作：切換貓咪、翻頁日期、新增/編輯/刪除紀錄、開總覽抽屜、新增貓咪。
const meta = {
  title: 'Views/HomeView',
  component: HomeView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof HomeView>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
