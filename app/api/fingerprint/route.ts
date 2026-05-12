import { NextResponse } from 'next/server';
import {
  extractContentFingerprint,
  computePerceptualHash,
  SUPPORTED_MIME_TYPES,
} from '@/lib/content-fingerprint';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mimeType = SUPPORTED_MIME_TYPES[file.type] || file.type;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const [contentFingerprintResult, pHashResult] = await Promise.allSettled([
      extractContentFingerprint(buffer, mimeType),
      computePerceptualHash(buffer, mimeType),
    ]);

    return NextResponse.json({
      contentFingerprint: contentFingerprintResult.status === 'fulfilled' ? contentFingerprintResult.value || null : null,
      pHash: pHashResult.status === 'fulfilled' ? pHashResult.value || null : null,
    });
  } catch (error) {
    console.error('Fingerprint API error:', error);
    return NextResponse.json({ error: 'Fingerprint extraction failed' }, { status: 500 });
  }
}
