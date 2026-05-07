import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { SecurityService } from '@/lib/security-service';
import { UsageService } from '@/lib/usage-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const registryId = searchParams.get('registryId');

    const client = await clientPromise;
    const db = client.db('tech-core');
    const registry = db.collection('registry');

    if (registryId) {
      const record = await registry.findOne({ registryId: registryId });
      if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      
      // Fetch registrar info
      const registrar = await db.collection('users').findOne(
        { email: { $regex: new RegExp(`^${record.userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { projection: { firstName: 1, lastName: 1, companyName: 1, entityType: 1, verificationStatus: 1 } }
      );
      
      return NextResponse.json(SecurityService.prepareForTransit({ ...record, registrar }));
    }

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const history = await registry.find({ userEmail: email.toLowerCase().trim() }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(SecurityService.prepareForTransit(history));
  } catch (error) {
    console.error('Registry GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = body.payload ? SecurityService.processFromTransit(body) : body;
    
    const { userEmail, registryId } = data;

    if (!userEmail || !registryId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const registry = db.collection('registry');
    const users = db.collection('users');

    // 1. Check Credentials and Permissions
    const user = await users.findOne({ email: userEmail.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json({ error: 'Identity mismatch' }, { status: 403 });
    }

    if (user.role !== 'admin' && !(user.permissions || []).includes('registry')) {
      return NextResponse.json({ error: 'Registry access denied' }, { status: 403 });
    }

    // NEW: Usage Logic - 5 Free registry uploads per month
    const canUseFree = await UsageService.canUseFree(userEmail.toLowerCase().trim(), 'registry');
    
    if (!canUseFree) {
      return NextResponse.json({ 
        error: 'Monthly free registry quota reached. Upgrade required for additional official uploads.',
        status: 'quota_exceeded'
      }, { status: 402 });
    }

    // Check for collision
    const existing = await registry.findOne({ registryId });
    if (existing) {
      return NextResponse.json({ error: 'Registry ID already exists' }, { status: 409 });
    }

    await UsageService.incrementUsage(userEmail.toLowerCase().trim(), 'registry');

    const result = await registry.insertOne({
      ...data,
      userEmail: userEmail.toLowerCase().trim(),
      createdAt: new Date(),
    });

    return NextResponse.json(SecurityService.prepareForTransit({ success: true, id: result.insertedId }));
  } catch (error) {
    console.error('Registry POST Error:', error);
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
    const registry = db.collection('registry');

    await registry.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
