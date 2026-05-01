import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { SecurityService } from '@/lib/security-service';

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
      return NextResponse.json(SecurityService.prepareForTransit(record));
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

    // 1. Check and Deduct Credits
    const user = await users.findOne({ email: userEmail.toLowerCase().trim() });
    if (!user || (user.credits || 0) < 12) {
      return NextResponse.json({ 
        error: 'Insufficient credits for official registry upload. Required: 12 Energy Units.',
        status: 'insufficient_credits'
      }, { status: 402 });
    }

    // Check for collision
    const existing = await registry.findOne({ registryId });
    if (existing) {
      return NextResponse.json({ error: 'Registry ID already exists' }, { status: 409 });
    }

    // Deduct credits
    await users.updateOne(
      { email: userEmail.toLowerCase().trim() },
      { $inc: { credits: -12 } }
    );

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
