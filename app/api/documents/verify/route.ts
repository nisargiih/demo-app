import { NextRequest, NextResponse } from 'next/server';
import { DocumentService, MatchType } from '@/lib/document-service';
import { SecurityService } from '@/lib/security-service';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const referenceDocumentId = formData.get('referenceDocumentId') as string;
    const file = formData.get('file') as File;

    if (!referenceDocumentId || !file) {
      return NextResponse.json({ error: 'Missing referenceDocumentId or file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await DocumentService.verifyDocument(referenceDocumentId, {
      buffer,
      mimeType: file.type,
      name: file.name
    });

    return NextResponse.json(SecurityService.prepareForTransit({
      verified: result.verified,
      matchType: result.matchType,
      hashMatched: result.hashMatched,
      contentChecked: result.contentChecked,
      similarityScore: result.similarityScore,
      bestMatchingPage: result.bestMatchingPage,
      confidence: result.confidence,
      fieldMatch: result.fieldMatch,
      missingFields: result.missingFields
    }));
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}
