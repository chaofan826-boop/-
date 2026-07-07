export type AdminLoginLogAction = 'login_success' | 'login_failure' | 'logout'

export interface AdminLoginLog {
  id: number
  userId: number | null
  account: string
  userName: string | null
  role: string | null
  action: AdminLoginLogAction
  failureReason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface AdminOperationLog {
  id: number
  actorId: number
  actorName: string
  actorRole: string
  module: string
  action: string
  method: string
  path: string
  summary: string
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface QueryLoginLogsParams {
  page?: number
  pageSize?: number
  keyword?: string
  action?: AdminLoginLogAction
}

export interface QueryOperationLogsParams {
  page?: number
  pageSize?: number
  keyword?: string
  module?: string
  action?: string
}
