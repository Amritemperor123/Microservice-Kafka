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
  AadhaarFile?: File;
  issuingAuthority?: string;
  registrationNumber?: string;
  aadhaarConsentGiven: boolean;
}

export interface BirthCertificate extends Omit<DeathCertificateForm, 'fatherAadhaarFile' | 'motherAadhaarFile'> {
  id: string;
  AadhaarFilePath?: string;
  aadhaarConsentTimestamp?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}