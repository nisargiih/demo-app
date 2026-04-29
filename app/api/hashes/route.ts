import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { SecurityService } from '@/lib/security-service';

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
      if (record && record.isStoredEncrypted) {
        // Decrypt storage data before sending
        record.fileName = SecurityService.processFromStorage(record.fileName);
        record.hashValue = SecurityService.processFromStorage(record.hashValue);
      }
      return NextResponse.json(record);
    }

    if (!email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const history = await hashes.find({ userEmail: email }).sort({ createdAt: -1 }).toArray();
    
    // Decrypt storage data for the list
    const decryptedHistory = history.map(item => {
      if (item.isStoredEncrypted) {
        return {
          ...item,
          fileName: SecurityService.processFromStorage(item.fileName),
          hash: SecurityService.processFromStorage(item.hash)
        };
      }
      return item;
    });

    return NextResponse.json(SecurityService.prepareForTransit(decryptedHistory));
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

    // 2. Prepare for Storage (Encrypt sensitive fields using different key/algo)
    const encryptedFileName = SecurityService.prepareForStorage(fileName);
    const encryptedHash = SecurityService.prepareForStorage(hash);

    // Check for duplicate (we search by userEmail and hash, but if hash is encrypted we can't easily search unless we hash it or keep a searchable index)
    // For this demo, we'll just insert
    
    const newHash = {
      userEmail,
      fileName: encryptedFileName,
      fileSize,
      hash: encryptedHash,
      expiryDate,
      createdAt: new Date(),
      isStoredEncrypted: true // Flag to know we need to decrypt on read
    };

    const result = await hashes.insertOne(newHash);

    // 3. Return encrypted for transit (Optional but good for symmetry)
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
