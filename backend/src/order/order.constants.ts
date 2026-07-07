export const PENDING_ORDER_PAY_TIMEOUT_MS = 30 * 60 * 1000;

export function buildPendingPayExpiresAt(from = new Date()) {
  return new Date(from.getTime() + PENDING_ORDER_PAY_TIMEOUT_MS);
}
