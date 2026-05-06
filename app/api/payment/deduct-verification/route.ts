import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { SecurityService } from '@/lib/security-service';
import { UsageService } from '@/lib/usage-service';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const user = await users.findOne({ email: cleanEmail });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // NEW: Usage Logic - 15 Free verifications per month
    const canUseFree = await UsageService.canUseFree(cleanEmail, 'verify');
    
    if (canUseFree) {
      // Use free quota
      await UsageService.incrementUsage(cleanEmail, 'verify');
    } else {
      // Deduct credits
      if ((user.credits || 0) < 1) {
        return NextResponse.json({ 
          error: 'Monthly free verification quota reached. Insufficient credits. Required: 1 Energy Unit.',
          status: 'insufficient_credits'
        }, { status: 402 });
      }

      await users.updateOne(
        { email: cleanEmail },
        { $inc: { credits: -1 } }
      );
    }

    return NextResponse.json(SecurityService.prepareForTransit({ success: true }));
  } catch (error) {
    console.error('Deduction Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
