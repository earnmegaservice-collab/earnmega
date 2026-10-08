import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { reference, type, payload, email, balance } = await request.json();

    if (!reference || !type || payload === undefined || !email) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Verify with Paystack API
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_test_placeholder';
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // 2. Securely update Supabase
    if (type === 'UPGRADE') {
      const { error } = await supabase
        .from('users')
        .update({ subscription_tier: payload })
        .eq('email', email);

      if (error) throw error;
    } else if (type === 'COIN') {
      // payload is the amount of coins
      const newBalance = (balance || 0) + parseInt(payload);
      const { error } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('email', email);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
