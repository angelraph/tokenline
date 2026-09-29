import { config } from './config';

export const ok = (body: unknown, init: ResponseInit = {}) =>
  Response.json(body, { ...init, headers: { 'access-control-allow-origin': '*', ...(init.headers ?? {}) } });

export const fail = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  Response.json({ error: message, ...extra }, { status, headers: { 'access-control-allow-origin': '*' } });

export function isAdmin(req: Request) {
  const t = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return !!config.adminToken && t === config.adminToken;
}

export function isCron(req: Request) {
  const t = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return isAdmin(req) || (!!config.cronSecret && t === config.cronSecret);
}
