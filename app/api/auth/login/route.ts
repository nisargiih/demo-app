import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import * as z from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const user = await users.findOne({ email });

    if (!user || user.password !== password) { // In production, use bcrypt.compare()
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isVerified) {
      return NextResponse.json({ error: 'Please verify your email first', redirect: '/verify-otp' }, { status: 403 });
    }

    return NextResponse.json({ 
      message: 'Login successful',
      user: { id: user._id, email: user.email, firstName: user.firstName }
    });
  } catch (error) {
    console.error('Login Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
