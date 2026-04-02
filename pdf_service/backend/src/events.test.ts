import assert from 'node:assert/strict';
import { buildAdminLogEvent, buildPdfCompleteEvent } from './kafka-producer';

const pdfCompleteEvent = buildPdfCompleteEvent(1, 2, '/tmp/file.pdf', 'birth');

assert.equal(typeof pdfCompleteEvent.eventId, 'string');
assert.equal(pdfCompleteEvent.submissionId, 1);
assert.equal(pdfCompleteEvent.pdfId, 2);
assert.equal(pdfCompleteEvent.certificateType, 'birth');

const adminLogEvent = buildAdminLogEvent('PDF_GENERATED', { submissionId: 1 });

assert.equal(typeof adminLogEvent.eventId, 'string');
assert.equal(adminLogEvent.action, 'PDF_GENERATED');
assert.deepEqual(adminLogEvent.details, { submissionId: 1 });

console.log('pdf event tests passed');
