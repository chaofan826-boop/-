export interface BatchDeleteResult {
  deleted: number[]
  failed: Array<{ id: number; reason: string }>
}

export interface BatchDeleteStringResult {
  deleted: string[]
  failed: Array<{ orderNo: string; reason: string }>
}
