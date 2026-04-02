import assert from 'node:assert/strict';
import { validateBirthForm } from './validation';

const validBirthForm = {
  firstName: 'Aarav',
  middleName: 'Kumar',
  lastName: 'Sharma',
  dateOfBirth: '2024-01-10',
  gender: 'male',
  timeOfBirth: '10:30',
  placeOfBirth: 'Jaipur, Rajasthan',
  fatherName: 'Rahul Sharma',
  fatherAadhaarNumber: '123456789012',
  motherName: 'Priya Sharma',
  motherAadhaarNumber: '987654321098',
  issuingAuthority: 'Municipal Office',
  registrationNumber: 'REG-001',
  aadhaarConsentGiven: true
};

assert.deepEqual(validateBirthForm(validBirthForm), []);

const birthErrors = validateBirthForm({
  ...validBirthForm,
  fatherAadhaarNumber: '123',
  extraField: 'unexpected'
});

assert.equal(birthErrors.includes('fatherAadhaarNumber must be a 12-digit number'), true);
assert.equal(birthErrors.includes('Unexpected field: extraField'), true);

console.log('birth validation tests passed');
