import assert from 'node:assert/strict';
import { validateDeathForm } from './validation';

const validDeathForm = {
  firstName: 'Rohan',
  middleName: 'Kumar',
  lastName: 'Singh',
  dateOfDeath: '2024-01-10',
  gender: 'male',
  timeOfDeath: '14:30',
  placeOfDeath: 'Delhi',
  AadhaarNumber: '123456789012',
  causeOfDeath: 'Natural causes',
  issuingAuthority: 'Civil Registrar',
  registrationNumber: 'DEATH-001',
  aadhaarConsentGiven: true
};

assert.deepEqual(validateDeathForm(validDeathForm), []);

const deathErrors = validateDeathForm({
  ...validDeathForm,
  dateOfDeath: '2099-01-01',
  aadhaarConsentGiven: false
});

assert.equal(deathErrors.includes('dateOfDeath cannot be in the future'), true);
assert.equal(deathErrors.includes('aadhaarConsentGiven must be true'), true);

console.log('death validation tests passed');
