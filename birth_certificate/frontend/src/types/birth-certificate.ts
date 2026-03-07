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
  fatherAadhaarFile?: File;
  motherName: string;
  motherAadhaarNumber: string;
  motherAadhaarFile?: File;
  issuingAuthority?: string;
  registrationNumber?: string;
  aadhaarConsentGiven: boolean;
}

export interface BirthCertificate extends Omit<BirthCertificateForm, 'fatherAadhaarFile' | 'motherAadhaarFile'> {
  id: string;
  fatherAadhaarFilePath?: string;
  motherAadhaarFilePath?: string;
  aadhaarConsentTimestamp?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}