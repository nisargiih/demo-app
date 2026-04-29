import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { SecurityService } from '@/lib/security-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawEmail = searchParams.get('email');

    if (!rawEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const email = rawEmail.trim().toLowerCase();

    const client = await clientPromise;
    const db = client.db('tech-core');
    const templates = db.collection('templates');

    const result = await templates.find({ userEmail: email }).sort({ createdAt: -1 }).toArray();
    
    return NextResponse.json(SecurityService.prepareForTransit(result));
  } catch (error) {
    console.error('Templates GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Process from Transit
    const data = body.payload ? SecurityService.processFromTransit(body) : body;
    const { userEmail: rawEmail, name, elements, ...otherData } = data;
    const userEmail = rawEmail?.trim().toLowerCase();

    if (!userEmail) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // 2. Prepare for Storage (Store in plain text as requested)
    const newTemplate = {
      ...otherData,
      userEmail,
      name,
      elements,
      createdAt: new Date().toISOString(),
    };

    const client = await clientPromise;
    const db = client.db('tech-core');
    const templates = db.collection('templates');

    const result = await templates.insertOne(newTemplate);

    const response = { id: result.insertedId };
    return NextResponse.json(SecurityService.prepareForTransit(response));
  } catch (error) {
    console.error('Templates POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Process from Transit
    const data = body.payload ? SecurityService.processFromTransit(body) : body;
    const { id, ...updateData } = data;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db('tech-core');
    const templates = db.collection('templates');

    await templates.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const response = { message: 'Template updated' };
    return NextResponse.json(SecurityService.prepareForTransit(response));
  } catch (error) {
    console.error('Templates PATCH Error:', error);
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
    const templates = db.collection('templates');

    await templates.deleteOne({ _id: new ObjectId(id) });

    const response = { message: 'Template deleted' };
    return NextResponse.json(SecurityService.prepareForTransit(response));
  } catch (error) {
    console.error('Templates DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
