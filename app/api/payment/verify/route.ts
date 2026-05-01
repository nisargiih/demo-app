import { NextResponse } from 'next/server';
import crypto from 'crypto';
import clientPromise from '@/lib/mongodb';
import { SecurityService } from '@/lib/security-service';

export async function POST(req: Request) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      email,
      amount // Amount in Rupees
    } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
       return NextResponse.json({ error: 'Razorpay secret is not configured' }, { status: 500 });
    }

    // 1. Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return NextResponse.json({ error: 'Payment verification failed: Invalid signature' }, { status: 400 });
    }

    // 2. Update Credits in Database
    // Ratio: ₹10 = 12 credits => ₹1 = 1.2 credits
    const creditsToAdd = Math.floor(amount * 1.2);
    
    const client = await clientPromise;
    const db = client.db('tech-core');
    const users = db.collection('users');

    const result = await users.updateOne(
      { email: email.toLowerCase().trim() },
      { $inc: { credits: creditsToAdd } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found to update credits' }, { status: 404 });
    }

    return NextResponse.json(SecurityService.prepareForTransit({ 
      success: true, 
      message: `${creditsToAdd} credits added successfully`,
      creditsAdded: creditsToAdd
    }));

  } catch (error) {
    console.error('Payment Verification Error:', error);
    return NextResponse.json({ error: 'Internal server error during verification' }, { status: 500 });
  }
}
