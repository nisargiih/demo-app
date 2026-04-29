import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { SecurityService } from '@/lib/security-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Process from Transit
    const data = body.payload ? SecurityService.processFromTransit(body) : body;
    const { email: rawEmail, entityType } = data;
    const email = rawEmail?.trim().toLowerCase();

    if (!email || !entityType) {
      return NextResponse.json(SecurityService.prepareForTransit({ error: 'Missing information' }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const result = await users.updateOne(
      { email },
      { $set: { entityType, onboardingCompleted: true } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(SecurityService.prepareForTransit({ error: 'User not found' }), { status: 404 });
    }

    const response = { message: 'Onboarding completed' };
    return NextResponse.json(SecurityService.prepareForTransit(response));
  } catch (error) {
    console.error('Onboarding Error:', error);
    return NextResponse.json(SecurityService.prepareForTransit({ error: 'Internal server error' }), { status: 500 });
  }
}
