import type { Meta, StoryObj } from '@storybook/vue3-vite'

import HomeViewPlayground from './HomeViewPlayground.vue'

// 這個 story 不對應單一元件，而是把 CatTabs / DateNav / DailyStats / RecordList /
// RecordFormSheet / AddCatSheet / ConfirmSheet / OverviewSheet 組裝成跟正式 app
// 的 HomeView 一樣的畫面（見 HomeViewPlayground.vue），資料是記憶體內的假資料，
// 可以真的點擊操作：切換貓咪、翻頁日期、新增/編輯/刪除紀錄、開總覽抽屜、新增貓咪。
const meta = {
  title: 'App/互動示範 Playground',
  component: HomeViewPlayground,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof HomeViewPlayground>

export default meta

type Story = StoryObj<typeof meta>

export const Interactive: Story = {}
