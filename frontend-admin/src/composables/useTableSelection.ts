import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

export interface BatchDeleteResult {
  deleted: number[]
  failed: Array<{ id: number; reason: string }>
}

export interface BatchDeleteStringResult {
  deleted: string[]
  failed: Array<{ orderNo: string; reason: string }>
}

export function useTableSelection<T>(getKey: (row: T) => number = (row) => (row as { id: number }).id) {
  const selectedRows = ref<T[]>([])
  const selectedIds = computed(() => (selectedRows.value as T[]).map(getKey))
  const hasSelection = computed(() => selectedRows.value.length > 0)

  function handleSelectionChange(rows: T[]) {
    selectedRows.value = rows
  }

  function clearSelection() {
    selectedRows.value = []
  }

  return {
    selectedRows,
    selectedIds,
    hasSelection,
    handleSelectionChange,
    clearSelection,
  }
}

export function useTableSelectionByKey<T>(getKey: (row: T) => string) {
  const selectedRows = ref<T[]>([])
  const selectedKeys = computed(() => (selectedRows.value as T[]).map(getKey))
  const hasSelection = computed(() => selectedRows.value.length > 0)

  function handleSelectionChange(rows: T[]) {
    selectedRows.value = rows
  }

  function clearSelection() {
    selectedRows.value = []
  }

  return {
    selectedRows,
    selectedKeys,
    hasSelection,
    handleSelectionChange,
    clearSelection,
  }
}

export async function confirmBatchDelete(count: number, label = '项') {
  await ElMessageBox.confirm(
    `确定删除选中的 ${count} ${label}？此操作不可恢复。`,
    '批量删除',
    { type: 'warning', confirmButtonText: '删除' },
  )
}

export function showBatchDeleteResult(
  result: { deleted: unknown[]; failed: unknown[] },
  entityLabel = '项',
) {
  if (result.deleted.length && !result.failed.length) {
    ElMessage.success(`已删除 ${result.deleted.length} ${entityLabel}`)
    return
  }
  if (result.deleted.length && result.failed.length) {
    ElMessage.warning(`成功删除 ${result.deleted.length} ${entityLabel}，${result.failed.length} 项失败`)
    return
  }
  ElMessage.error('删除失败，请检查选中项是否可删除')
}
