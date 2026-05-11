import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { SecurityService } from '@/lib/security-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.toLowerCase();
    const checkSessionId = searchParams.get('checkSessionId');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const sessions = db.collection('sessions');

    if (checkSessionId) {
      const session = await sessions.findOne({ email, sessionId: checkSessionId });
      return NextResponse.json(SecurityService.prepareForTransit({ isValid: !!session }));
    }

    const userSessions = await sessions.find({ email }).sort({ lastActive: -1 }).toArray();

    return NextResponse.json(SecurityService.prepareForTransit({ sessions: userSessions }));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const email = searchParams.get('email')?.toLowerCase();
    const purgeAll = searchParams.get('all') === 'true';

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('tech-core');
    const sessions = db.collection('sessions');

    if (purgeAll) {
      // Keep only current session if sessionId is provided, or delete all
      const currentSessionId = searchParams.get('currentSessionId');
      if (currentSessionId) {
        await sessions.deleteMany({ email, sessionId: { $ne: currentSessionId } });
      } else {
        await sessions.deleteMany({ email });
      }
      return NextResponse.json(SecurityService.prepareForTransit({ message: 'All other sessions purged' }));
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    await sessions.deleteOne({ email, sessionId });

    return NextResponse.json(SecurityService.prepareForTransit({ message: 'Session revoked' }));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
  }
}
