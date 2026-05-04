import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import * as z from 'zod';
import { SecurityService } from '@/lib/security-service';

const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Process from Transit
    const data = body.payload ? SecurityService.processFromTransit(body) : body;
    const validatedData = registerSchema.parse(data);

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const existingUser = await users.findOne({ email: validatedData.email });
    if (existingUser) {
      return NextResponse.json(SecurityService.prepareForTransit({ error: 'User already exists' }), { status: 400 });
    }

    // Generate 6-char alphanumeric OTP
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let otp = '';
    for (let i = 0; i < 6; i++) {
      otp += chars[Math.floor(Math.random() * chars.length)];
    }

    // 2. Prepare for Storage (Store in plain text as requested)
    const email = validatedData.email.trim().toLowerCase();
    
    // Check if this is the first user
    const userCount = await users.countDocuments();
    const role = userCount === 0 ? 'admin' : 'member';

    const newUser = {
      ...validatedData,
      email, // Indexable
      isVerified: false,
      verificationStatus: 'unverified',
      role,
      permissions: role === 'member' ? ['dashboard'] : ['dashboard', 'notarize', 'registry', 'verify', 'analytics', 'settings'],
      credits: 0,
      otp, 
      createdAt: new Date(),
    };

    await users.insertOne(newUser);

    const response = { message: 'Registration successful' };
    return NextResponse.json(SecurityService.prepareForTransit(response), { status: 201 });
  } catch (error) {
    console.error('Registration Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(SecurityService.prepareForTransit({ error: error.issues }), { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(SecurityService.prepareForTransit({ error: errorMessage }), { status: 500 });
  }
}
