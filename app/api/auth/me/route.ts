import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { SecurityService } from '@/lib/security-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawEmail = searchParams.get('email');

    if (!rawEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const email = rawEmail.trim().toLowerCase();

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const user = await users.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't send password or internal data
    const { password, otp, ...safeUser } = user;
    
    // Encrypt for transit
    return NextResponse.json(SecurityService.prepareForTransit(safeUser));
  } catch (error) {
    console.error('Profile GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Decrypt from transit
    const data = body.payload ? SecurityService.processFromTransit(body) : body;
    const { email: rawEmail, ...updateData } = data;

    if (!rawEmail) {
       return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const email = rawEmail.trim().toLowerCase();

    // Remove immutable fields
    delete updateData._id;

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    await users.updateOne(
      { email },
      { $set: updateData }
    );

    const response = { message: 'Profile updated' };
    return NextResponse.json(SecurityService.prepareForTransit(response));
  } catch (error) {
    console.error('Profile PATCH Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
