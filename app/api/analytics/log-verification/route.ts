import { NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/analytics-service';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    await AnalyticsService.logVerification(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Log Verification Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
