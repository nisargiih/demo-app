import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const user = await users.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't send password
    const { password, otp, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { email, ...updateData } = await req.json();

    if (!email) {
       return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Remove immutable fields that might be sent from the client
    delete updateData._id;

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    await users.updateOne(
      { email },
      { $set: updateData }
    );

    return NextResponse.json({ message: 'Profile updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
