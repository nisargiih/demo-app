import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '@/lib/document-service';
import { SecurityService } from '@/lib/security-service';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userEmail = formData.get('userEmail') as string;

    if (!file || !userEmail) {
      return NextResponse.json({ error: 'Missing file or userEmail' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const docId = await DocumentService.storeReferenceDocument(
      { buffer, mimeType: file.type, name: file.name },
      { userEmail: userEmail.toLowerCase().trim() }
    );

    return NextResponse.json(SecurityService.prepareForTransit({
      message: 'Reference document stored and indexed',
      documentId: docId
    }));
  } catch (error: any) {
    console.error('Reference upload error:', error);
    return NextResponse.json({ error: error.message || 'Reference upload failed' }, { status: 500 });
  }
}
