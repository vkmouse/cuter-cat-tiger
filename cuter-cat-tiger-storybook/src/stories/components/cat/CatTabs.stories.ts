import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn } from 'storybook/test'

import CatTabs from '../../../../../cuter-cat-tiger/src/components/cat/CatTabs.vue'
import type { Cat } from '../../../../../cuter-cat-tiger/src/types'

function makeCat(id: number, name: string): Cat {
  return {
    id,
    name,
    createdAt: new Date().toISOString(),
  }
}

const CATS: Cat[] = [
  makeCat(1, '橘子'),
  makeCat(2, '小黑'),
  makeCat(3, '奶油'),
]

const meta = {
  title: 'Cat/CatTabs',
  component: CatTabs,
  tags: ['autodocs'],
  argTypes: {
    cats: {
      control: 'object',
      description: '貓咪清單，依序顯示為分頁。',
    },
    activeCatId: {
      control: 'number',
      description: '目前選中的貓咪 id，對應分頁會顯示 active 樣式。',
    },
    select: { action: 'select' },
    addCat: { action: 'addCat' },
    editCat: { action: 'editCat' },
  },
  args: {
    select: fn(),
    addCat: fn(),
    editCat: fn(),
  },
} satisfies Meta<typeof CatTabs>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    cats: CATS,
    activeCatId: 1,
  },
}

export const SecondTabActive: Story = {
  args: {
    cats: CATS,
    activeCatId: 2,
  },
}

export const SingleCat: Story = {
  args: {
    cats: [makeCat(1, '橘子')],
    activeCatId: 1,
  },
}

export const Empty: Story = {
  args: {
    cats: [],
    activeCatId: null,
  },
}

// 點擊「已經是 active」的 tab，右上角應浮出編輯鈕（此互動只存在於元件內部的
// revealEditForId state，光靠 args/props 組出的靜態 story 測不到，需要 play function）。
export const ClickActiveTabRevealsEditButton: Story = {
  args: {
    cats: CATS,
    activeCatId: 1,
  },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.queryByRole('button', { name: '編輯貓咪' })).not.toBeInTheDocument()

    await userEvent.click(canvas.getByText('橘子'))

    await expect(canvas.getByRole('button', { name: '編輯貓咪' })).toBeVisible()
    // 只是浮出編輯鈕，不應該當成一次「切換 tab」
    await expect(canvas.getByRole('button', { name: '編輯貓咪' })).toBeInTheDocument()
  },
}

// 浮出編輯鈕後點下去，應該觸發 editCat（帶上該貓的 id），且鈕會收起，
// 同時不能誤觸 select（click.stop 要有效擋住冒泡）。
export const ClickEditButtonEmitsEditCat: Story = {
  args: {
    cats: CATS,
    activeCatId: 1,
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText('橘子'))
    await userEvent.click(canvas.getByRole('button', { name: '編輯貓咪' }))

    await expect(args.editCat).toHaveBeenCalledTimes(1)
    await expect(args.editCat).toHaveBeenCalledWith(1)
    await expect(args.select).not.toHaveBeenCalled()
    await expect(canvas.queryByRole('button', { name: '編輯貓咪' })).not.toBeInTheDocument()
  },
}

// 對同一個 active tab 點兩下是 toggle：第二下要把編輯鈕收起來，且完全不觸發 select。
export const ClickActiveTabTwiceHidesEditButton: Story = {
  args: {
    cats: CATS,
    activeCatId: 1,
  },
  play: async ({ args, canvas, userEvent }) => {
    const tab = canvas.getByText('橘子')

    await userEvent.click(tab)
    await expect(canvas.getByRole('button', { name: '編輯貓咪' })).toBeVisible()

    await userEvent.click(tab)
    await expect(canvas.queryByRole('button', { name: '編輯貓咪' })).not.toBeInTheDocument()
    await expect(args.select).not.toHaveBeenCalled()
  },
}

// 編輯鈕浮出後，切去別的 tab 應該要收起編輯鈕、並正常觸發 select。
export const SwitchingTabHidesRevealedEditButton: Story = {
  args: {
    cats: CATS,
    activeCatId: 1,
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText('橘子'))
    await expect(canvas.getByRole('button', { name: '編輯貓咪' })).toBeVisible()

    await userEvent.click(canvas.getByText('小黑'))

    await expect(args.select).toHaveBeenCalledWith(2)
    await expect(canvas.queryByRole('button', { name: '編輯貓咪' })).not.toBeInTheDocument()
  },
}
