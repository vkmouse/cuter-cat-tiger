import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AllCatsStatsSheet from '../../../../../cuter-cat-tiger/src/components/stats/AllCatsStatsSheet.vue'
import type { DailyStat } from '../../../../../cuter-cat-tiger/src/types'

function makeStat(overrides: Partial<DailyStat> & Pick<DailyStat, 'catId' | 'name'>): DailyStat {
  return {
    waterMl: 0,
    foodG: 0,
    peeCount: 0,
    poopCount: 0,
    lastPeeAt: null,
    lastPoopAt: null,
    ...overrides,
  }
}

const meta = {
  title: 'Stats/AllCatsStatsSheet',
  component: AllCatsStatsSheet,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '是否顯示（透過 BaseSheet）。',
    },
    date: {
      control: 'text',
      description: '日期 key，格式 YYYY-MM-DD，顯示在標題「今日總覽 · ...」裡。',
    },
    stats: {
      control: 'object',
      description: '每隻貓的當日統計清單。',
    },
    activeCatId: {
      control: 'number',
      description: '目前選中的貓咪 id，對應列會有 active 樣式。',
    },
    loading: {
      control: 'boolean',
      description: '載入中時顯示「載入中…」，蓋過其他狀態。',
    },
    error: {
      control: 'text',
      description: '有錯誤訊息時顯示錯誤文字（優先度低於 loading）。',
    },
    cancel: { action: 'cancel' },
    selectCat: { action: 'selectCat' },
  },
} satisfies Meta<typeof AllCatsStatsSheet>

export default meta

type Story = StoryObj<typeof meta>

export const Loading: Story = {
  args: {
    open: true,
    date: '2026-08-19',
    stats: [],
    activeCatId: null,
    loading: true,
  },
}

export const Error: Story = {
  args: {
    open: true,
    date: '2026-08-19',
    stats: [],
    activeCatId: null,
    error: '讀取總覽資料失敗，請稍後再試一次。',
  },
}

export const Empty: Story = {
  args: {
    open: true,
    date: '2026-08-19',
    stats: [],
    activeCatId: null,
  },
}

// 水量/飼料量刻意設計出明顯差異：小黑水量明顯最少 → 應出現「今日喝水較少」標記，
// 且長條圖寬度依「這批貓咪裡的最大值」換算百分比（橘子水量最高應該是滿格）。
export const MultipleCats: Story = {
  args: {
    open: true,
    date: '2026-08-19',
    activeCatId: 1,
    stats: [
      makeStat({
        catId: 1,
        name: '橘子',
        waterMl: 320,
        foodG: 85,
        peeCount: 3,
        poopCount: 1,
        lastPeeAt: '2026-08-19T07:00:00.000Z',
        lastPoopAt: '2026-08-19T02:00:00.000Z',
      }),
      makeStat({
        catId: 2,
        name: '小黑',
        waterMl: 60,
        foodG: 70,
        peeCount: 2,
        poopCount: 1,
        lastPeeAt: '2026-08-19T05:30:00.000Z',
        lastPoopAt: null,
      }),
      makeStat({
        catId: 3,
        name: '奶油',
        waterMl: 210,
        foodG: 90,
        peeCount: 4,
        poopCount: 2,
        lastPeeAt: '2026-08-19T08:15:00.000Z',
        lastPoopAt: '2026-08-19T06:00:00.000Z',
      }),
    ],
  },
}

// 邊界情況：所有貓咪水量相同時，不該出現「今日喝水較少」標記
export const AllEqual: Story = {
  args: {
    open: true,
    date: '2026-08-19',
    activeCatId: 1,
    stats: [
      makeStat({ catId: 1, name: '橘子', waterMl: 150, foodG: 60, peeCount: 2, poopCount: 1 }),
      makeStat({ catId: 2, name: '小黑', waterMl: 150, foodG: 60, peeCount: 2, poopCount: 1 }),
    ],
  },
}

// 邊界情況：只有一隻貓時，同樣不該出現「今日喝水較少」標記
export const SingleCat: Story = {
  args: {
    open: true,
    date: '2026-08-19',
    activeCatId: 1,
    stats: [
      makeStat({
        catId: 1,
        name: '橘子',
        waterMl: 320,
        foodG: 85,
        peeCount: 3,
        poopCount: 1,
        lastPeeAt: '2026-08-19T07:00:00.000Z',
        lastPoopAt: '2026-08-19T02:00:00.000Z',
      }),
    ],
  },
}
