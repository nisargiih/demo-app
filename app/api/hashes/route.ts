import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const hashValue = searchParams.get('hash');

    const client = await clientPromise;
    const db = client.db('tech-core');
    const hashes = db.collection('hashes');

    if (hashValue) {
      const record = await hashes.findOne({ hash: hashValue });
      return NextResponse.json(record);
    }

    if (!email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const history = await hashes.find({ userEmail: email }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userEmail, fileName, fileSize, hash, expiryDate } = await req.json();

    if (!userEmail || !hash) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const hashes = db.collection('hashes');

    const newHash = {
      userEmail,
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
