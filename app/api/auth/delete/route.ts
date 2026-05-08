import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    
    // 1. Delete user
    await db.collection('users').deleteOne({ email: email.toLowerCase().trim() });
    
    // 2. Delete hashes
    await db.collection('hashes').deleteMany({ userEmail: email.toLowerCase().trim() });
    
    // 3. Delete registry records
    await db.collection('registry').deleteMany({ userEmail: email.toLowerCase().trim() });
    
    // 4. Delete analytics
    await db.collection('analytics').deleteMany({ userEmail: email.toLowerCase().trim() });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Account Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
