import { NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/analytics-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const stats = await AnalyticsService.getVerificationStats(email);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Analytics Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
