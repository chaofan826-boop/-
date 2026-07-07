import { HttpException } from '@nestjs/common';

export interface BatchDeleteResult {
  deleted: number[];
  failed: Array<{ id: number; reason: string }>;
}

export function batchDeleteErrorMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = (response as { message: string | string[] }).message;
      return Array.isArray(message) ? message[0] : message;
    }
  }
  if (error instanceof Error) return error.message;
  return '操作失败';
}

export async function runBatchDelete(
  ids: number[],
  remove: (id: number) => Promise<unknown>,
): Promise<BatchDeleteResult> {
  const deleted: number[] = [];
  const failed: BatchDeleteResult['failed'] = [];

  for (const id of ids) {
    try {
      await remove(id);
      deleted.push(id);
    } catch (error) {
      failed.push({ id, reason: batchDeleteErrorMessage(error) });
    }
  }

  return { deleted, failed };
}
