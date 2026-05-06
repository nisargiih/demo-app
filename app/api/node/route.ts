import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const user = await users.findOne(
      { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { projection: { 
        firstName: 1, 
        lastName: 1, 
        companyName: 1, 
        entityType: 1, 
        verificationStatus: 1 
      } }
    );

    if (!user) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Node API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
