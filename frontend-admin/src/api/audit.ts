import { get, post } from './request'
import type { PaginatedResult } from '@/types/api'
import type { BatchDeleteResult } from '@/types/batch-delete'
import type {
  AdminLoginLog,
  AdminOperationLog,
  QueryLoginLogsParams,
  QueryOperationLogsParams,
} from '@/types/audit'

export const getLoginLogs = (params?: QueryLoginLogsParams) =>
  get<PaginatedResult<AdminLoginLog>>('/audit/login-logs', { params })

export const getOperationLogs = (params?: QueryOperationLogsParams) =>
  get<PaginatedResult<AdminOperationLog>>('/audit/operation-logs', { params })

export const batchDeleteLoginLogs = (ids: number[]) =>
  post<BatchDeleteResult>('/audit/login-logs/batch-delete', { ids })

export const batchDeleteOperationLogs = (ids: number[]) =>
  post<BatchDeleteResult>('/audit/operation-logs/batch-delete', { ids })
