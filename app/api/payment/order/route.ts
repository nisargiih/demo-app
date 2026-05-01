import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

let razorpayInstance: Razorpay | null = null;

function getRazorpay() {
  if (!razorpayInstance) {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials are not configured');
    }
    
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

export async function POST(req: Request) {
  try {
    const { amount, email } = await req.json();

    if (!amount || amount < 100) {
      return NextResponse.json({ error: 'Minimum payment amount is ₹100' }, { status: 400 });
    }

    const rzp = getRazorpay();
    
    const options = {
      amount: amount * 100, // amount in the smallest currency unit (paisa)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        email: email,
        type: 'credit_purchase'
      }
    };

    const order = await rzp.orders.create(options);

    return NextResponse.json(order);
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
