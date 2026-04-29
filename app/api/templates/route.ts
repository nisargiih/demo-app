import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { SecurityService } from '@/lib/security-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const templates = db.collection('templates');

    const result = await templates.find({ userEmail: email }).sort({ createdAt: -1 }).toArray();
    
    // Decrypt from storage
    const decryptedResult = result.map(item => {
      if (item.isStoredEncrypted) {
        return {
          ...item,
          name: SecurityService.processFromStorage(item.name),
          elements: SecurityService.processFromStorage(item.elements)
        };
      }
      return item;
    });

    return NextResponse.json(SecurityService.prepareForTransit(decryptedResult));
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
    const { userEmail, name, elements, ...otherData } = data;

    if (!userEmail) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // 2. Prepare for Storage
    const encryptedTemplate = {
      ...otherData,
      userEmail,
      name: SecurityService.prepareForStorage(name),
      elements: SecurityService.prepareForStorage(elements),
      createdAt: new Date().toISOString(),
      isStoredEncrypted: true
    };

    const client = await clientPromise;
    const db = client.db('tech-core');
    const templates = db.collection('templates');

    const result = await templates.insertOne(encryptedTemplate);

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
    const { id, name, elements, ...updateData } = data;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // 2. Prepare for Storage
    const encryptedUpdate: any = { ...updateData, isStoredEncrypted: true };
    if (name) encryptedUpdate.name = SecurityService.prepareForStorage(name);
    if (elements) encryptedUpdate.elements = SecurityService.prepareForStorage(elements);

    const client = await clientPromise;
    const db = client.db('tech-core');
    const templates = db.collection('templates');

    await templates.updateOne(
      { _id: new ObjectId(id) },
      { $set: encryptedUpdate }
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
