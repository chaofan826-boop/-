export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function buildPaginatedResult<T>(
  list: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 0,
  };
}
