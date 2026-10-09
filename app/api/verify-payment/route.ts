import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { reference, type, payload } = await request.json();

    if (!reference || !type || payload === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Securely fetch user from Supabase using Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized or invalid token' }, { status: 401 });
    }

    const secureEmail = user.email;

    if (!secureEmail) {
      return NextResponse.json({ error: 'No email associated with user' }, { status: 400 });
    }

    // 2. Verify with Paystack API
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

    // 3. Update Supabase
    if (type === 'UPGRADE') {
      const { error } = await supabase
        .from('users')
        .update({ subscription_tier: payload })
        .eq('email', secureEmail);

      if (error) throw error;
    } else if (type === 'COIN') {
      // Fetch the current balance securely from the database
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('balance')
        .eq('email', secureEmail)
        .single();

      if (fetchError) {
        console.error("Failed to fetch user balance", fetchError);
        // For the sake of this demo/repo if the user doesn't exist, we might proceed or error.
        // Let's assume the user exists, but we handle it gracefully if it fails:
      }

      const currentBalance = userData?.balance || 0;
      // payload is the amount of coins purchased
      const newBalance = currentBalance + parseInt(payload);

      const { error } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('email', secureEmail);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
