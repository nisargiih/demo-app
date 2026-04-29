import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { SecurityService } from '@/lib/security-service';

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

    // Decrypt sensitive fields from storage
    if (user.isStoredEncrypted) {
      const sensitiveFields = ['firstName', 'lastName', 'jobTitle', 'phone', 'location', 'bio', 'company'];
      sensitiveFields.forEach(field => {
        if (user[field]) {
          user[field] = SecurityService.processFromStorage(user[field]);
        }
      });
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
    const { email, ...updateData } = data;

    if (!email) {
       return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Remove immutable fields
    delete updateData._id;

    // 2. Encrypt sensitive fields for storage
    const encryptedUpdateData: any = { ...updateData, isStoredEncrypted: true };
    const sensitiveFields = ['firstName', 'lastName', 'jobTitle', 'phone', 'location', 'bio', 'company'];
    
    sensitiveFields.forEach(field => {
      if (encryptedUpdateData[field]) {
        encryptedUpdateData[field] = SecurityService.prepareForStorage(encryptedUpdateData[field]);
      }
    });

    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    await users.updateOne(
      { email },
      { $set: encryptedUpdateData }
    );

    const response = { message: 'Profile updated' };
    return NextResponse.json(SecurityService.prepareForTransit(response));
  } catch (error) {
    console.error('Profile PATCH Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
