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

    // In a real app, hash the password!
    const newUser = {
      ...validatedData,
      isVerified: false,
      otp: Math.floor(1000 + Math.random() * 9000).toString(), // Simple 4-digit OTP
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
