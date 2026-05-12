import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { compareFingerprints, type MatchType } from '@/lib/content-fingerprint';

export async function POST(req: Request) {
  try {
    const { contentFingerprint, pHash } = await req.json();

    console.log('[lookup] received - contentFingerprint length:', contentFingerprint?.length ?? 0, '| pHash:', pHash);

    if (!contentFingerprint && !pHash) {
      console.log('[lookup] no fingerprints provided');
      return NextResponse.json(null);
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const hashes = db.collection('hashes');

    const allHashes = await hashes.find(
      {},
      { projection: { contentFingerprint: 1, pHash: 1, userEmail: 1, fileName: 1, hash: 1, createdAt: 1, expiryDate: 1, tags: 1, fileKey: 1 } }
    ).limit(500).toArray();

    console.log('[lookup] total records to scan:', allHashes.length);
    console.log('[lookup] records with pHash:', allHashes.filter(r => r.pHash).length);
    console.log('[lookup] records with contentFingerprint:', allHashes.filter(r => r.contentFingerprint).length);

    let bestRecord: any = null;
    let bestMatch: { matchType: MatchType; confidence: number } = { matchType: 'none', confidence: 0 };

    for (const rec of allHashes) {
      if (!rec.contentFingerprint && !rec.pHash) continue;

      const match = compareFingerprints(
        { contentFingerprint: contentFingerprint || '', pHash: pHash || '' },
        { contentFingerprint: rec.contentFingerprint || '', pHash: rec.pHash || '' }
      );

      console.log(`[lookup] record "${rec.fileName}" -> matchType: ${match.matchType}, confidence: ${match.confidence.toFixed(3)}, storedPHash: ${rec.pHash?.slice(0,20)}...`);
      console.log(`[lookup] candidate contentFingerprint: ${(contentFingerprint || '').slice(0, 100)}...`);
      console.log(`[lookup] stored contentFingerprint: ${(rec.contentFingerprint || '').slice(0, 100)}...`);

      if (match.matchType !== 'none' && match.confidence > bestMatch.confidence) {
        bestMatch = match;
        bestRecord = rec;
      }
    }

    console.log('[lookup] best match:', bestMatch.matchType, bestMatch.confidence);

    if (!bestRecord) return NextResponse.json(null);

    const registrar = await db.collection('users').findOne(
      { email: { $regex: new RegExp(`^${bestRecord.userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { projection: { firstName: 1, lastName: 1, companyName: 1, companyEmail: 1, companyWebsite: 1, companyRegistration: 1, companyIndustry: 1, entityType: 1, verificationStatus: 1, location: 1 } }
    );

    return NextResponse.json({
      ...bestRecord,
      registrar,
      matchType: bestMatch.matchType,
      matchConfidence: bestMatch.confidence,
    });
  } catch (error) {
    console.error('Fingerprint lookup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
