import type { Request } from 'express';

export type RequestMeta = {
  ipAddress: string | null;
  userAgent: string | null;
};

export function getRequestMeta(req: Request): RequestMeta {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : null) ||
    req.ip ||
    req.socket.remoteAddress ||
    null;

  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;

  return {
    ipAddress: ip,
    userAgent,
  };
}
