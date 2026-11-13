import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, amount, amountGhs, reference, callback_url, metadata } = body || {};

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json(
        { error: 'A valid buyer email address is required to initialize Paystack.' },
        { status: 400 }
      );
    }

    const amountPesewas =
      typeof amount === 'number' && amount > 0
        ? Math.round(amount)
        : Math.round(Number(amountGhs || 0) * 100);

    if (!amountPesewas || amountPesewas < 100) {
      return NextResponse.json(
        { error: 'Invalid transaction amount in GHS pesewas.' },
        { status: 400 }
      );
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json(
        { error: 'Server configuration error: PAYSTACK_SECRET_KEY is not configured.' },
        { status: 500 }
      );
    }

    const txRef =
      String(reference || '').trim() ||
      `HP_P2_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const payload: Record<string, any> = {
      email: cleanEmail,
      amount: amountPesewas,
      currency: 'GHS',
      reference: txRef,
      channels: ['card', 'mobile_money', 'bank', 'ussd', 'qr', 'bank_transfer'],
      metadata: metadata || {},
    };

    if (callback_url) {
      payload.callback_url = String(callback_url);
    }

    const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const initJson = await initRes.json();

    if (!initRes.ok || !initJson?.status || !initJson?.data?.authorization_url) {
      return NextResponse.json(
        {
          error:
            initJson?.message ||
            'Could not initialize Paystack checkout session. Please try again.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      authorization_url: initJson.data.authorization_url,
      access_code: initJson.data.access_code,
      reference: initJson.data.reference || txRef,
    });
  } catch (err: any) {
    console.error('Paystack initialize error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to initialize Paystack transaction.' },
      { status: 500 }
    );
  }
}
