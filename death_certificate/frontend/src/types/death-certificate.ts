export interface DeathCertificateForm {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfDeath: string;
  gender: 'male' | 'female' | 'other';
  timeOfDeath?: string;
  placeOfDeath: string;
  AadhaarNumber?: string;
  CauseOfDeath: string;
  issuingAuthority?: string;
  registrationNumber?: string;
  aadhaarConsentGiven: boolean;
}

export interface BirthCertificate extends DeathCertificateForm {
  id: string;
  aadhaarConsentTimestamp?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}
