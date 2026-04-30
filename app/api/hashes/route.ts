import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { SecurityService } from '@/lib/security-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawEmail = searchParams.get('email');
    const hashValue = searchParams.get('hash');

    const client = await clientPromise;
    const db = client.db('tech-core');
    const hashes = db.collection('hashes');

    if (hashValue) {
      const record = await hashes.findOne({ hash: hashValue });
      return NextResponse.json(record);
    }

    if (!rawEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const email = rawEmail.trim().toLowerCase();

    const history = await hashes.find({ userEmail: email }).sort({ createdAt: -1 }).toArray();
    
    return NextResponse.json(SecurityService.prepareForTransit(history));
  } catch (error) {
    console.error('API GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Process from Transit (Decrypt if it was encrypted by frontend)
    const data = body.payload ? SecurityService.processFromTransit(body) : body;
    const { userEmail, fileName, fileSize, hash, expiryDate } = data;

    if (!userEmail || !hash) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const hashes = db.collection('hashes');

    // Check for existing hash
    const existing = await hashes.findOne({ hash });
    if (existing) {
      if (existing.userEmail === userEmail.trim().toLowerCase()) {
        const responseData = { 
          message: 'Already Indexed', 
          status: 'exists_user',
          record: existing 
        };
        return NextResponse.json(SecurityService.prepareForTransit(responseData), { status: 200 });
      } else {
        const responseData = { 
          message: 'Indexed by Another Node', 
          status: 'exists_other',
          createdAt: existing.createdAt
        };
        return NextResponse.json(SecurityService.prepareForTransit(responseData), { status: 200 });
      }
    }

    const newHash = {
      userEmail: userEmail.trim().toLowerCase(),
      fileName,
      fileSize,
      hash,
      expiryDate,
      createdAt: new Date(),
    };

    const result = await hashes.insertOne(newHash);

    // 2. Return encrypted for transit
    const responseData = { message: 'Hash stored successfully', id: result.insertedId };
    return NextResponse.json(SecurityService.prepareForTransit(responseData));
  } catch (error) {
    console.error('API POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, ids, expiryDate } = await req.json();

    if (!id && (!ids || !Array.isArray(ids))) {
      return NextResponse.json({ error: 'ID or IDs required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const hashes = db.collection('hashes');

    if (ids) {
      await hashes.updateMany(
        { _id: { $in: ids.map((i: string) => new ObjectId(i)) } },
        { $set: { expiryDate } }
      );
    } else {
      await hashes.updateOne(
        { _id: new ObjectId(id) },
        { $set: { expiryDate } }
      );
    }

    return NextResponse.json({ message: 'Expiry updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db('tech-core');
    const hashes = db.collection('hashes');

    await hashes.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ message: 'Hash deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
