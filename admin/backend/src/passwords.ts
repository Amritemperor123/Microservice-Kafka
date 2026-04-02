import crypto from 'crypto';

const HASH_PREFIX = 'scrypt';
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${HASH_PREFIX}$${salt}$${derivedKey}`;
}

export function isHashedPassword(value: string): boolean {
  return typeof value === 'string' && value.startsWith(`${HASH_PREFIX}$`);
}

export function verifyPassword(password: string, storedValue: string): boolean {
  if (!isHashedPassword(storedValue)) {
    return password === storedValue;
  }

  const [, salt, storedHash] = storedValue.split('$');
  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  const derivedBuffer = Buffer.from(derivedKey, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  return derivedBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(derivedBuffer, storedBuffer);
}
