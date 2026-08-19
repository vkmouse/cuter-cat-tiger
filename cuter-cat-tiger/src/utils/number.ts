// 數字格式化工具。
// round1 原本在 DailyStats.vue / AllCatsStatsSheet.vue / RecordRow.vue 各自重複定義，
// 這裡收斂成唯一定義來源，三個元件都改為 import 使用。

/** 四捨五入到小數點後 1 位（水量 ml / 飼料量 g 顯示用） */
export function round1(n: number): number {
  return Math.round(n * 10) / 10
}
