import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const hashes = db.collection('hashes');

    const history = await hashes.find({ userEmail: email }).sort({ createdAt: -1 }).limit(10).toArray();

    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { email, fileName, fileSize, hash, expiryDate } = await req.json();

    if (!email || !hash) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const hashes = db.collection('hashes');

    const newHash = {
      userEmail: email,
      fileName,
      fileSize,
      hash,
      expiryDate,
      createdAt: new Date(),
    };

    await hashes.insertOne(newHash);

    return NextResponse.json({ message: 'Hash stored successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
