import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { SecurityService } from '@/lib/security-service';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const user = await users.findOne({ email: email.toLowerCase().trim() });
    
    if (!user || (user.credits || 0) < 1) {
      return NextResponse.json({ 
        error: 'Insufficient credits for verification pulse. Required: 1 Energy Unit.',
        status: 'insufficient_credits'
      }, { status: 402 });
    }

    await users.updateOne(
      { email: email.toLowerCase().trim() },
      { $inc: { credits: -1 } }
    );

    return NextResponse.json(SecurityService.prepareForTransit({ success: true }));
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
