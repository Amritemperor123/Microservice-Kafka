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

export function validateDeathForm(formData: any): string[] {
  const errors: string[] = [];

  if (!formData || typeof formData !== 'object') {
    return ['formData is required'];
  }

  const allowedFields = new Set([
    'firstName',
    'middleName',
    'lastName',
    'dateOfDeath',
    'gender',
    'timeOfDeath',
    'placeOfDeath',
    'AadhaarNumber',
    'causeOfDeath',
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
    'dateOfDeath',
    'gender',
    'placeOfDeath',
    'AadhaarNumber',
    'causeOfDeath'
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

  if (!['male', 'female', 'other'].includes(formData.gender)) {
    errors.push('gender must be one of male, female, or other');
  }

  if (!isNonEmptyString(formData.dateOfDeath) || !isValidDate(formData.dateOfDeath)) {
    errors.push('dateOfDeath must be a valid date in YYYY-MM-DD format');
  } else if (!isPastOrToday(formData.dateOfDeath)) {
    errors.push('dateOfDeath cannot be in the future');
  }

  if (formData.timeOfDeath !== undefined && formData.timeOfDeath !== '' && !isValidTime(formData.timeOfDeath)) {
    errors.push('timeOfDeath must be in HH:MM format');
  }

  if (!isNonEmptyString(formData.placeOfDeath) || formData.placeOfDeath.trim().length > 150) {
    errors.push('placeOfDeath must be between 1 and 150 characters');
  }

  if (!/^\d{12}$/.test(formData.AadhaarNumber || '')) {
    errors.push('AadhaarNumber must be a 12-digit number');
  }

  if (!isNonEmptyString(formData.causeOfDeath) || formData.causeOfDeath.trim().length > 200) {
    errors.push('causeOfDeath must be between 1 and 200 characters');
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
