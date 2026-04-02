function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.trim().length > 0);
}

function isValidName(value: string): boolean {
  return /^[A-Za-z\s.'-]{2,100}$/.test(value.trim());
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function isPastOrToday(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);
  return parsed.getTime() <= today.getTime();
}

function isValidTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

export function validateBirthForm(formData: any): string[] {
  const errors: string[] = [];

  if (!formData || typeof formData !== 'object') {
    return ['formData is required'];
  }

  const allowedFields = new Set([
    'firstName',
    'middleName',
    'lastName',
    'dateOfBirth',
    'gender',
    'timeOfBirth',
    'placeOfBirth',
    'fatherName',
    'fatherAadhaarNumber',
    'motherName',
    'motherAadhaarNumber',
    'issuingAuthority',
    'registrationNumber',
    'aadhaarConsentGiven'
  ]);

  for (const key of Object.keys(formData)) {
    if (!allowedFields.has(key)) {
      errors.push(`Unexpected field: ${key}`);
    }
  }

  const requiredFields = [
    'firstName',
    'lastName',
    'dateOfBirth',
    'gender',
    'placeOfBirth',
    'fatherName',
    'fatherAadhaarNumber',
    'motherName',
    'motherAadhaarNumber'
  ];

  for (const field of requiredFields) {
    if (!isNonEmptyString(formData[field])) {
      errors.push(`${field} is required`);
    }
  }

  if (isNonEmptyString(formData.firstName) && !isValidName(formData.firstName)) {
    errors.push('firstName is invalid');
  }

  if (formData.middleName !== undefined && !isOptionalString(formData.middleName)) {
    errors.push('middleName must be a non-empty string when provided');
  } else if (isNonEmptyString(formData.middleName) && !isValidName(formData.middleName)) {
    errors.push('middleName is invalid');
  }

  if (isNonEmptyString(formData.lastName) && !isValidName(formData.lastName)) {
    errors.push('lastName is invalid');
  }

  if (isNonEmptyString(formData.fatherName) && !isValidName(formData.fatherName)) {
    errors.push('fatherName is invalid');
  }

  if (isNonEmptyString(formData.motherName) && !isValidName(formData.motherName)) {
    errors.push('motherName is invalid');
  }

  if (!['male', 'female', 'other'].includes(formData.gender)) {
    errors.push('gender must be one of male, female, or other');
  }

  if (!isNonEmptyString(formData.dateOfBirth) || !isValidDate(formData.dateOfBirth)) {
    errors.push('dateOfBirth must be a valid date in YYYY-MM-DD format');
  } else if (!isPastOrToday(formData.dateOfBirth)) {
    errors.push('dateOfBirth cannot be in the future');
  }

  if (formData.timeOfBirth !== undefined && formData.timeOfBirth !== '' && !isValidTime(formData.timeOfBirth)) {
    errors.push('timeOfBirth must be in HH:MM format');
  }

  if (!isNonEmptyString(formData.placeOfBirth) || formData.placeOfBirth.trim().length > 150) {
    errors.push('placeOfBirth must be between 1 and 150 characters');
  }

  if (!/^\d{12}$/.test(formData.fatherAadhaarNumber || '')) {
    errors.push('fatherAadhaarNumber must be a 12-digit number');
  }

  if (!/^\d{12}$/.test(formData.motherAadhaarNumber || '')) {
    errors.push('motherAadhaarNumber must be a 12-digit number');
  }

  if (formData.issuingAuthority !== undefined && !isOptionalString(formData.issuingAuthority)) {
    errors.push('issuingAuthority must be a non-empty string when provided');
  }

  if (formData.registrationNumber !== undefined && !isOptionalString(formData.registrationNumber)) {
    errors.push('registrationNumber must be a non-empty string when provided');
  }

  if (formData.aadhaarConsentGiven !== true) {
    errors.push('aadhaarConsentGiven must be true');
  }

  return errors;
}
