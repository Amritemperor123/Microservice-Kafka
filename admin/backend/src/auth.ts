import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'change-this-demo-secret';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 8;

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
}

export function issueAdminToken(username: string): string {
  const payload = JSON.stringify({
    sub: username,
    exp: Date.now() + TOKEN_TTL_MS
  });
  const encodedPayload = encodeBase64Url(payload);
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminToken(token?: string | null): { valid: boolean; username?: string } {
  if (!token) {
    return { valid: false };
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return { valid: false };
  }

  const expectedSignature = signPayload(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as { sub: string; exp: number };
    if (!payload.sub || !payload.exp || payload.exp < Date.now()) {
      return { valid: false };
    }

    return { valid: true, username: payload.sub };
  } catch {
    return { valid: false };
  }
}

function extractBearerToken(authorization?: string): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);
  const result = verifyAdminToken(token);

  if (!result.valid) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  res.locals.adminUser = result.username;
  next();
}

export function getWebSocketToken(url?: string): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url, 'http://localhost');
    return parsed.searchParams.get('token');
  } catch {
    return null;
  }
}
