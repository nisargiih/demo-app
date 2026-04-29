import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { SecurityService } from '@/lib/security-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Process from Transit
    const data = body.payload ? SecurityService.processFromTransit(body) : body;
    const { email, otp } = data;

    if (!email || !otp) {
      return NextResponse.json(SecurityService.prepareForTransit({ error: 'Missing parameters' }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const user = await users.findOne({ email, otp });

    if (!user) {
      return NextResponse.json(SecurityService.prepareForTransit({ error: 'Invalid OTP' }), { status: 400 });
    }

    await users.updateOne(
      { _id: user._id },
      { $set: { isVerified: true }, $unset: { otp: "" } }
    );

    const response = { message: 'Verification successful' };
    return NextResponse.json(SecurityService.prepareForTransit(response));
  } catch (error) {
    console.error('OTP Verification Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(SecurityService.prepareForTransit({ error: errorMessage }), { status: 500 });
  }
}
