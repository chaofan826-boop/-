export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export function success<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 0, message, data };
}

export function fail(code: number, message: string): ApiResponse<Record<string, never>> {
  return { code, message, data: {} };
}
