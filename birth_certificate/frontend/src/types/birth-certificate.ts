export interface BirthCertificateForm {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  timeOfBirth?: string;
  placeOfBirth: string;
  fatherName: string;
  fatherAadhaarNumber: string;
  motherName: string;
  motherAadhaarNumber: string;
  issuingAuthority?: string;
  registrationNumber?: string;
  aadhaarConsentGiven: boolean;
}

export interface BirthCertificate extends BirthCertificateForm {
  id: string;
  aadhaarConsentTimestamp?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}
