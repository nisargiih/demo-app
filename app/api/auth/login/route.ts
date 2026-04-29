import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import * as z from 'zod';
import { SecurityService } from '@/lib/security-service';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Process from Transit
    const data = body.payload ? SecurityService.processFromTransit(body) : body;
    const { email, password } = loginSchema.parse(data);

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const user = await users.findOne({ email });

    if (!user) {
      return NextResponse.json(SecurityService.prepareForTransit({ error: 'Invalid credentials' }), { status: 401 });
    }

    // Compare passwords (decrypt from storage if needed)
    const storedPassword = user.isStoredEncrypted 
      ? SecurityService.processFromStorage(user.password)
      : user.password;

    if (storedPassword !== password) {
      return NextResponse.json(SecurityService.prepareForTransit({ error: 'Invalid credentials' }), { status: 401 });
    }

    if (!user.isVerified) {
      return NextResponse.json(SecurityService.prepareForTransit({ error: 'Please verify your email first', redirect: '/verify-otp' }), { status: 403 });
    }

    // Check for 2FA
    if (user.is2FAEnabled) {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let otp = '';
      for (let i = 0; i < 6; i++) {
        otp += chars[Math.floor(Math.random() * chars.length)];
      }

      await users.updateOne(
        { email },
        { $set: { otp } }
      );

      return NextResponse.json(SecurityService.prepareForTransit({ 
        requires2FA: true, 
        message: 'Secondary authentication required' 
      }));
    }

    // Decrypt names for the response user object
    const firstName = user.isStoredEncrypted ? SecurityService.processFromStorage(user.firstName) : user.firstName;

    const response = { 
      message: 'Login successful',
      user: { id: user._id, email: user.email, firstName }
    };
    
    return NextResponse.json(SecurityService.prepareForTransit(response));
  } catch (error) {
    console.error('Login Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(SecurityService.prepareForTransit({ error: errorMessage }), { status: 500 });
  }
}
