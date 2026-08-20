
/** 四捨五入到小數點後 1 位（水量 ml / 飼料量 g 顯示用） */
export function round1(n: number): number {
  return Math.round(n * 10) / 10
}
