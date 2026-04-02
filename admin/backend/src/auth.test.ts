import assert from 'node:assert/strict';
import { issueAdminToken, verifyAdminToken } from './auth';
import { hashPassword, isHashedPassword, verifyPassword } from './passwords';

const hashedPassword = hashPassword('admin123');

assert.equal(isHashedPassword(hashedPassword), true);
assert.equal(verifyPassword('admin123', hashedPassword), true);
assert.equal(verifyPassword('wrong-password', hashedPassword), false);

assert.equal(verifyPassword('admin123', 'admin123'), true);
assert.equal(verifyPassword('wrong-password', 'admin123'), false);

const token = issueAdminToken('admin');
const verification = verifyAdminToken(token);

assert.equal(verification.valid, true);
assert.equal(verification.username, 'admin');

console.log('admin auth tests passed');
