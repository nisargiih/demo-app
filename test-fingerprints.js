import { extractContentFingerprint, computePerceptualHash, compareFingerprints } from '../lib/content-fingerprint';
import { readFileSync } from 'fs';

// Test fingerprint extraction for different file types
async function testFingerprints() {
  try {
    // Test PDF
    const pdfBuffer = readFileSync('./test-files/sample.pdf');
    const pdfFingerprint = await extractContentFingerprint(pdfBuffer, 'application/pdf');
    const pdfPHash = await computePerceptualHash(pdfBuffer, 'application/pdf');
    console.log('PDF Fingerprint:', pdfFingerprint.slice(0, 100) + '...');
    console.log('PDF pHash:', pdfPHash);

    // Test DOCX
    const docxBuffer = readFileSync('./test-files/sample.docx');
    const docxFingerprint = await extractContentFingerprint(docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const docxPHash = await computePerceptualHash(docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    console.log('DOCX Fingerprint:', docxFingerprint.slice(0, 100) + '...');
    console.log('DOCX pHash:', docxPHash);

    // Test PNG
    const pngBuffer = readFileSync('./test-files/sample.png');
    const pngFingerprint = await extractContentFingerprint(pngBuffer, 'image/png');
    const pngPHash = await computePerceptualHash(pngBuffer, 'image/png');
    console.log('PNG Fingerprint:', pngFingerprint.slice(0, 100) + '...');
    console.log('PNG pHash:', pngPHash);

    // Compare
    const pdfVsDocx = compareFingerprints(
      { contentFingerprint: docxFingerprint, pHash: docxPHash },
      { contentFingerprint: pdfFingerprint, pHash: pdfPHash }
    );
    console.log('PDF vs DOCX:', pdfVsDocx);

    const pdfVsPng = compareFingerprints(
      { contentFingerprint: pngFingerprint, pHash: pngPHash },
      { contentFingerprint: pdfFingerprint, pHash: pdfPHash }
    );
    console.log('PDF vs PNG:', pdfVsPng);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFingerprints();