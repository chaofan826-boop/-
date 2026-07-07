export function generateOrderNo(): string {
  const now = new Date();
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `CB${timestamp}${random}`;
}
