import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import * as z from 'zod';

const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const existingUser = await users.findOne({ email: validatedData.email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Generate 6-char alphanumeric OTP
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let otp = '';
    for (let i = 0; i < 6; i++) {
      otp += chars[Math.floor(Math.random() * chars.length)];
    }

    const newUser = {
      ...validatedData,
      isVerified: false,
      otp, 
      createdAt: new Date(),
    };

    await users.insertOne(newUser);

    // TODO: Send email with OTP

    return NextResponse.json({ message: 'Registration successful' }, { status: 201 });
  } catch (error) {
    console.error('Registration Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
