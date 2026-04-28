import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    const { email, entityType } = await req.json();

    if (!email || !entityType) {
      return NextResponse.json({ error: 'Missing information' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const result = await users.updateOne(
      { email },
      { $set: { entityType, onboardingCompleted: true } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Onboarding completed' });
  } catch (error) {
    console.error('Onboarding Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
