import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { SecurityService } from '@/lib/security-service';
import { UsageService } from '@/lib/usage-service';

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
      if (record) {
        // Fetch registrar info
        const registrar = await db.collection('users').findOne(
          { email: { $regex: new RegExp(`^${record.userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { projection: { firstName: 1, lastName: 1, companyName: 1, entityType: 1, verificationStatus: 1 } }
        );
        return NextResponse.json({ ...record, registrar });
      }

      // 2. Check in Official Registry
      const regRecord = await registry.findOne({ fileHash: hashValue });
      if (regRecord) {
        // Fetch registrar info
        const registrar = await db.collection('users').findOne(
          { email: { $regex: new RegExp(`^${regRecord.userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { projection: { firstName: 1, lastName: 1, companyName: 1, entityType: 1, verificationStatus: 1 } }
        );
        return NextResponse.json({ ...regRecord, type: 'registry', registrar });
      }

      // REMOVED: Tamper detection fuzzy logic. Exact matches only.
      return NextResponse.json(null);
    }

    if (!rawEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const email = rawEmail.trim().toLowerCase();
    const parentId = await UsageService.resolveUsageId(email);

    const history = await hashes.find({ 
      $or: [
        { userEmail: email },
        { userId: parentId }
      ]
    }).sort({ createdAt: -1 }).toArray();
    
    // Also include usage stats
    const usage = await UsageService.getMonthlyUsage(email);
    
    return NextResponse.json(SecurityService.prepareForTransit({
      history,
      usage: {
        hashCount: usage.hashCount || 0,
        verifyCount: usage.verifyCount || 0,
        hashLimit: 10,
        verifyLimit: 15
      }
    }));
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
    const { userEmail, fileName, fileSize, hash, expiryDate, tags } = data;

    if (!userEmail || !hash) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const hashes = db.collection('hashes');
    const users = db.collection('users');

    const email = userEmail.trim().toLowerCase();

    // 1. Check Credentials and Permissions
    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Identity mismatch' }, { status: 403 });
    }

    if (user.role !== 'admin' && !(user.permissions || []).includes('notarize')) {
       return NextResponse.json({ error: 'Index protocol access denied' }, { status: 403 });
    }

    // Check for existing hash
    const existing = await hashes.findOne({ hash });
    if (existing) {
      if (existing.userEmail === email) {
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

    // NEW: Usage Logic - 10 Free hashes per month
    const parentId = await UsageService.resolveUsageId(email);
    const canUseFree = await UsageService.canUseFree(email, 'hash');
    
    if (!canUseFree) {
      return NextResponse.json({ 
        error: 'Monthly free quota reached. Upgrade required for additional indexing.',
        status: 'quota_exceeded'
      }, { status: 402 });
    }

    await UsageService.incrementUsage(email, 'hash');

    const newHash = {
      userEmail: email,
      userId: parentId,
      fileName,
      fileSize,
      hash,
      expiryDate,
      tags: tags || [],
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
    const { id, ids, expiryDate, tags, userEmail } = await req.json();

    if (!userEmail) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    if (!id && (!ids || !Array.isArray(ids))) {
      return NextResponse.json({ error: 'ID or IDs required' }, { status: 400 });
    }

    const email = userEmail.trim().toLowerCase();
    const parentId = await UsageService.resolveUsageId(email);

    const client = await clientPromise;
    const db = client.db('tech-core');
    const hashes = db.collection('hashes');

    const filter: any = { 
      $or: [
        { userEmail: email },
        { userId: parentId }
      ]
    };

    const update: any = { $set: {} };
    if (expiryDate !== undefined) update.$set.expiryDate = expiryDate;
    if (tags !== undefined) update.$set.tags = tags;

    if (ids) {
      filter._id = { $in: ids.map((i: string) => new ObjectId(i)) };
      await hashes.updateMany(filter, update);
    } else {
      filter._id = new ObjectId(id);
      await hashes.updateOne(filter, update);
    }

    return NextResponse.json({ message: 'Record updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userEmail = searchParams.get('email');

    if (!id || !userEmail) return NextResponse.json({ error: 'ID and Email required' }, { status: 400 });

    const email = userEmail.trim().toLowerCase();
    const parentId = await UsageService.resolveUsageId(email);

    const client = await clientPromise;
    const db = client.db('tech-core');
    const hashes = db.collection('hashes');

    const result = await hashes.deleteOne({ 
      _id: new ObjectId(id),
      $or: [
        { userEmail: email },
        { userId: parentId }
      ]
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Record not found or access denied' }, { status: 403 });
    }

    return NextResponse.json({ message: 'Hash deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
