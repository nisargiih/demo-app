import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userEmail, ...templateData } = body;

    if (!userEmail) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const templates = db.collection('templates');

    const result = await templates.insertOne({
      ...templateData,
      userEmail,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ id: result.insertedId });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db('tech-core');
    const templates = db.collection('templates');

    await templates.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    return NextResponse.json({ message: 'Template updated' });
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
    const templates = db.collection('templates');

    await templates.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ message: 'Template deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
