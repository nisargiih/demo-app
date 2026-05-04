import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(req: Request) {
  try {
    const { id, fileHash, fileSize } = await req.json();

    if (!id || !fileHash) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const registry = db.collection('registry');

    const result = await registry.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          fileHash: fileHash, 
          fileSize: fileSize,
          fingerprintLockedAt: new Date().toISOString()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Hash Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
