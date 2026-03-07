import PDFDocument from 'pdfkit';
import fs from 'fs';
import db from './database'; // Import the database instance

export const generatePdf = async (submissionId: number, outputPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            }
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Retrieve formData from the database
        const stmt = db.prepare('SELECT data FROM submissions WHERE id = ?');
        const result = stmt.get(submissionId) as { data: string };

        if (!result || !result.data) {
            console.error(`No data found for submission ID: ${submissionId}`);
            doc.end();
            reject(new Error(`No data found for submission ID: ${submissionId}`));
            return;
        }

        const formData = JSON.parse(result.data);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('BIRTH CERTIFICATE', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text('Government of India', { align: 'center' });
        doc.moveDown(2);

        // Certificate Number
        doc.fontSize(14).font('Helvetica-Bold').text(`Certificate Number: ${submissionId.toString().padStart(6, '0')}`, { align: 'center' });
        doc.moveDown(2);

        // Personal Information Section
        doc.fontSize(16).font('Helvetica-Bold').text('Personal Information', { underline: true });
        doc.moveDown(0.5);
        
        const personalInfo = [
            ['First Name:', formData.firstName],
            ['Middle Name:', formData.middleName || 'N/A'],
            ['Last Name:', formData.lastName],
            ['Date of Birth:', formData.dateOfBirth],
            ['Gender:', formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1)],
            ['Time of Birth:', formData.timeOfBirth || 'N/A'],
            ['Place of Birth:', formData.placeOfBirth]
        ];

        personalInfo.forEach(([label, value]) => {
            doc.fontSize(12).font('Helvetica-Bold').text(label, { continued: true });
            doc.fontSize(12).font('Helvetica').text(` ${value}`);
        });

        doc.moveDown(1);

        // Father's Information Section
        doc.fontSize(16).font('Helvetica-Bold').text('Father\'s Information', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica-Bold').text('Name:', { continued: true });
        doc.fontSize(12).font('Helvetica').text(` ${formData.fatherName}`);
        doc.fontSize(12).font('Helvetica-Bold').text('Aadhaar Number:', { continued: true });
        doc.fontSize(12).font('Helvetica').text(` ${formData.fatherAadhaarNumber}`);

        doc.moveDown(1);

        // Mother's Information Section
        doc.fontSize(16).font('Helvetica-Bold').text('Mother\'s Information', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica-Bold').text('Name:', { continued: true });
        doc.fontSize(12).font('Helvetica').text(` ${formData.motherName}`);
        doc.fontSize(12).font('Helvetica-Bold').text('Aadhaar Number:', { continued: true });
        doc.fontSize(12).font('Helvetica').text(` ${formData.motherAadhaarNumber}`);

        doc.moveDown(1);

        // Official Information Section
        if (formData.issuingAuthority || formData.registrationNumber) {
            doc.fontSize(16).font('Helvetica-Bold').text('Official Information', { underline: true });
            doc.moveDown(0.5);
            
            if (formData.issuingAuthority) {
                doc.fontSize(12).font('Helvetica-Bold').text('Issuing Authority:', { continued: true });
                doc.fontSize(12).font('Helvetica').text(` ${formData.issuingAuthority}`);
            }
            
            if (formData.registrationNumber) {
                doc.fontSize(12).font('Helvetica-Bold').text('Registration Number:', { continued: true });
                doc.fontSize(12).font('Helvetica').text(` ${formData.registrationNumber}`);
            }
            
            doc.moveDown(1);
        }

        // Footer
        doc.moveDown(2);
        doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(`Certificate ID: ${submissionId}`, { align: 'center' });

        writeStream.on('finish', () => {
            resolve();
        });

        writeStream.on('error', (error) => {
            reject(error);
        });

        doc.end();
    });
};
