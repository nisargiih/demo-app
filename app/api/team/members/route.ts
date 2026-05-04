import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { SecurityService } from '@/lib/security-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get('adminEmail');

    if (!adminEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const admin = await users.findOne({ email: adminEmail.toLowerCase() });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 0 }); // 0 for transit logic or 403
    }

    // Fetch all users
    const allUsers = await users.find({}).project({ password: 0, otp: 0 }).toArray();
    
    return NextResponse.json(SecurityService.prepareForTransit(allUsers));
  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const data = SecurityService.processFromTransit(body);
    const { adminEmail, targetEmail, updates } = data;

    if (!adminEmail || !targetEmail || !updates) {
       return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const admin = await users.findOne({ email: adminEmail.toLowerCase() });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Can't demote yourself if you are the only admin (optional safety)
    
    await users.updateOne(
      { email: targetEmail.toLowerCase() },
      { $set: updates }
    );

    return NextResponse.json(SecurityService.prepareForTransit({ success: true }));
  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
