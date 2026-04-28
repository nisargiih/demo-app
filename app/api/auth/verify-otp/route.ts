import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const user = await users.findOne({ email, otp });

    if (!user) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    await users.updateOne(
      { _id: user._id },
      { $set: { isVerified: true }, $unset: { otp: "" } }
    );

    return NextResponse.json({ message: 'Verification successful' });
  } catch (error) {
    console.error('OTP Verification Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
