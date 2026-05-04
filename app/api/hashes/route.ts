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
    const registry = db.collection('registry');

    if (hashValue) {
      // 1. Check in Notarized Hashes
      const record = await hashes.findOne({ hash: hashValue });
      if (record) return NextResponse.json(record);

      // 2. Check in Official Registry
      const regRecord = await registry.findOne({ fileHash: hashValue });
      if (regRecord) return NextResponse.json({ ...regRecord, type: 'registry' });

      // TAMPER DETECTION: If no exact hash match, check for filename/docname match to detect edits
      const fileName = searchParams.get('fileName');
    if (fileName) {
        // Clean filename: remove extension, common suffixes, and normalize
        const nameWithoutExt = fileName.split('.')[0];
        const baseName = nameWithoutExt.replace(/\s*\(.*?\)\s*$/, '').replace(/[-_]/g, ' ').trim();
        
        // Define stop words to ignore during fuzzy matching
        const stopWords = new Set(['document', 'doc', 'file', 'report', 'final', 'copy', 'v1', 'v2', 'scan', 'the', 'and', 'new', 'draft', 'version']);
        
        // Extract meaningful keywords
        const keywords = baseName.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
        
        const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // 1. Broad search in notarized hashes
        // Threshold: Match at least 2 keywords if available, OR a strong name overlap
        const fuzzyQuery = keywords.length >= 2 
          ? { $regex: new RegExp(keywords.slice(0, 2).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*'), 'i') }
          : { $regex: new RegExp(`^${escapedBase.split(' ')[0]}`, 'i') }; // Match start of name for single-word files

        const similarHash = await hashes.findOne(
          { 
            $or: [
              { fileName: { $regex: new RegExp(escapedBase, 'i') } },
              { fileName: fuzzyQuery }
            ]
          },
          { sort: { createdAt: -1 } }
        );

        if (similarHash) {
          return NextResponse.json({
            ...similarHash,
            isTampered: true,
            originalHash: similarHash.hash,
            originalSize: similarHash.fileSize
          });
        }

        // 2. Broad search in official registry
        const similarReg = await registry.findOne(
          { 
            $or: [
              { docName: { $regex: new RegExp(escapedBase, 'i') } },
              { fileName: { $regex: new RegExp(escapedBase, 'i') } },
              { docName: fuzzyQuery },
              { fileName: fuzzyQuery }
            ]
          },
          { sort: { createdAt: -1 } }
        );

        if (similarReg) {
          return NextResponse.json({
            ...similarReg,
            type: 'registry',
            isTamperDetected: true, // Marker for UI
            isTampered: true,
            originalHash: similarReg.fileHash || similarReg.hash,
            originalSize: similarReg.fileSize || similarReg.originalSize
          });
        }
      }

      return NextResponse.json(null);
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
    const users = db.collection('users');

    // 1. Check and Deduct Credits
    const user = await users.findOne({ email: userEmail.trim().toLowerCase() });
    if (!user || (user.credits || 0) < 7) {
      return NextResponse.json({ 
        error: 'Insufficient credits for hash generation pulse. Required: 7 Energy Units.',
        status: 'insufficient_credits'
      }, { status: 402 });
    }

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

    // Deduct credits
    await users.updateOne(
      { email: userEmail.trim().toLowerCase() },
      { $inc: { credits: -7 } }
    );

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
