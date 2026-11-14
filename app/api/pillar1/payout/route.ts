import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

type SupportedPayoutCurrency =
    | 'GHS'
    | 'NGN'
    | 'KES'
    | 'ZAR'
    | 'USD'
    | 'GBP'
    | 'EUR'
    | 'CAD'
    | 'XOF';

const FALLBACK_GHS_EXCHANGE_RATES: Record<SupportedPayoutCurrency, number> = {
    GHS: 1.0,
    NGN: 108.0,
    KES: 8.5,
    ZAR: 1.18,
    USD: 0.066,
    GBP: 0.052,
    EUR: 0.061,
    CAD: 0.091,
    XOF: 40.0,
};

const CURRENCY_METADATA: Record<
    SupportedPayoutCurrency,
    { symbol: string; label: string }
> = {
    GHS: { symbol: 'GH₵', label: 'GHS - Ghana Cedi' },
    NGN: { symbol: '₦', label: 'NGN - Nigerian Naira' },
    KES: { symbol: 'KSh', label: 'KES - Kenyan Shilling' },
    ZAR: { symbol: 'R', label: 'ZAR - South African Rand' },
    USD: { symbol: '$', label: 'USD - US Dollar' },
    GBP: { symbol: '£', label: 'GBP - British Pound' },
    EUR: { symbol: '€', label: 'EUR - Euro' },
    CAD: { symbol: 'CA$', label: 'CAD - Canadian Dollar' },
    XOF: { symbol: 'CFA ', label: 'XOF - CFA Franc' },
};

function getSupabaseAdmin() {
    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseServiceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        'placeholder';

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

function resolveVerifiedCoins(profile: Record<string, any> | null | undefined): number {
    if (!profile) return 0;
    const coinsCol = typeof profile.coins === 'number' ? profile.coins : Number(profile.coins);
    const balanceCol =
        typeof profile.coin_balance === 'number'
            ? profile.coin_balance
            : Number(profile.coin_balance);

    if (Number.isFinite(coinsCol) && coinsCol > 0) {
        return Math.floor(coinsCol);
    }
    if (Number.isFinite(balanceCol) && balanceCol > 0) {
        return Math.floor(balanceCol);
    }
    return 0;
}

function escapeHtml(value: string): string {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export async function GET(request: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const authHeader = request.headers.get('Authorization');
        const { searchParams } = new URL(request.url);
        let userId = searchParams.get('userId') || '';

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '').trim();
            if (token) {
                const { data: authData } = await supabase.auth.getUser(token);
                if (authData?.user?.id) {
                    userId = authData.user.id;
                }
            }
        }

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Missing user session' },
                { status: 401 }
            );
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return NextResponse.json(
                { success: false, error: 'Unable to verify coin balance from profile' },
                { status: 404 }
            );
        }

        const availableCoins = resolveVerifiedCoins(profile);

        return NextResponse.json({
            success: true,
            availableCoins,
            basePayoutGHS: Number((availableCoins * 0.5).toFixed(2)),
        });
    } catch (err: any) {
        console.error('[Pillar1 Payout GET Error]:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to fetch verified balance' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const body = await request.json();

        // Phase 2 Kill Switch Check: freeze_p1_withdrawals
        const { data: platformSettings } = await supabase
            .from('platform_settings')
            .select('freeze_p1_withdrawals')
            .eq('id', 1)
            .maybeSingle();

        if (platformSettings?.freeze_p1_withdrawals) {
            return NextResponse.json(
                {
                    success: false,
                    error: '⏸️ Withdrawals are temporarily paused for scheduled settlement auditing.'
                },
                { status: 403 }
            );
        }

        // 1. Authenticate user on the server
        const authHeader = request.headers.get('Authorization');
        let authenticatedUserId: string | null = null;
        let authEmail: string | null = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '').trim();
            if (token) {
                const { data: authData, error: authError } = await supabase.auth.getUser(token);
                if (!authError && authData?.user) {
                    authenticatedUserId = authData.user.id;
                    authEmail = authData.user.email || null;
                }
            }
        }

        const targetUserId = authenticatedUserId || body.userId;
        if (!targetUserId || typeof targetUserId !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Authentication required to request a coin payout.' },
                { status: 401 }
            );
        }

        // If both Bearer token user and body.userId exist, ensure they match
        if (authenticatedUserId && body.userId && authenticatedUserId !== body.userId) {
            return NextResponse.json(
                { success: false, error: 'Session mismatch detected. Please sign in again.' },
                { status: 403 }
            );
        }

        // 2. Query true available coin balance in Supabase (never trust client localStorage)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .single();

        if (profileError || !profile) {
            return NextResponse.json(
                { success: false, error: 'Verified user profile not found.' },
                { status: 404 }
            );
        }

        if (profile.is_banned || profile.is_wallet_frozen) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Account payouts are currently restricted. Please contact support.',
                },
                { status: 403 }
            );
        }

        const dbAvailableCoins = resolveVerifiedCoins(profile);

        // 3. Validate requestedCoins (must be an integer >= 1 and <= dbAvailableCoins)
        const rawRequestedCoins = Number(body.coinsToWithdraw ?? body.requestedCoins);
        if (
            !Number.isFinite(rawRequestedCoins) ||
            !Number.isInteger(rawRequestedCoins) ||
            rawRequestedCoins <= 0 ||
            rawRequestedCoins > dbAvailableCoins
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Insufficient verified coin balance',
                    verifiedAvailableCoins: dbAvailableCoins,
                },
                { status: 400 }
            );
        }

        const requestedCoins = rawRequestedCoins;

        // 4. Validate Payout Destination Details
        const payoutMethod: 'momo' | 'bank' =
            body.payoutMethod === 'bank' ? 'bank' : 'momo';
        const country = String(body.country || '').trim();

        const networkProvider = String(body.networkProvider || '').trim();
        const accountName = String(body.accountName || '').trim();
        const phoneNumber = String(body.phoneNumber || '').trim();

        const bankName = String(body.bankName || '').trim();
        const accountHolderName = String(body.accountHolderName || '').trim();
        const accountNumber = String(body.accountNumber || '').trim();
        const routingOrIban = String(body.routingOrIban || '').trim();

        if (!country) {
            return NextResponse.json(
                { success: false, error: 'Please specify your country for payout.' },
                { status: 400 }
            );
        }

        if (payoutMethod === 'momo') {
            if (!networkProvider || !accountName || !phoneNumber) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Please complete all Mobile Money fields (Network Provider, Account Name, Phone Number, and Country).',
                    },
                    { status: 400 }
                );
            }
        } else {
            if (!bankName || !accountHolderName || !accountNumber) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Please complete all Bank Transfer fields (Bank Name, Account Holder Name, Account Number / IBAN, and Country).',
                    },
                    { status: 400 }
                );
            }
        }

        // 5. Strict 50% Conversion Math (1 Coin = 0.50 GHS)
        const basePayoutGHS = Number((requestedCoins * 0.5).toFixed(2));

        // 6. Worldwide Currency Conversion
        const rawCurrency = String(body.selectedCurrency || 'GHS').toUpperCase();
        const selectedCurrency: SupportedPayoutCurrency = (
            Object.keys(FALLBACK_GHS_EXCHANGE_RATES).includes(rawCurrency)
                ? rawCurrency
                : 'GHS'
        ) as SupportedPayoutCurrency;

        let exchangeRate = FALLBACK_GHS_EXCHANGE_RATES[selectedCurrency];
        const clientProvidedRate = Number(body.exchangeRate);

        if (selectedCurrency === 'GHS') {
            exchangeRate = 1.0;
        } else {
            try {
                const rateRes = await fetch('https://open.er-api.com/v6/latest/GHS', {
                    signal: AbortSignal.timeout(3500),
                });
                if (rateRes.ok) {
                    const rateData = await rateRes.json();
                    if (
                        rateData?.rates &&
                        typeof rateData.rates[selectedCurrency] === 'number' &&
                        rateData.rates[selectedCurrency] > 0
                    ) {
                        exchangeRate = rateData.rates[selectedCurrency];
                    }
                }
            } catch {
                if (
                    Number.isFinite(clientProvidedRate) &&
                    clientProvidedRate > 0 &&
                    clientProvidedRate < FALLBACK_GHS_EXCHANGE_RATES[selectedCurrency] * 3 &&
                    clientProvidedRate > FALLBACK_GHS_EXCHANGE_RATES[selectedCurrency] * 0.3
                ) {
                    exchangeRate = clientProvidedRate;
                }
            }
        }

        const convertedAmount = Number((basePayoutGHS * exchangeRate).toFixed(2));
        const currencyMeta = CURRENCY_METADATA[selectedCurrency];

        // 7. Atomic Balance Deduction in Supabase
        const remainingCoins = dbAvailableCoins - requestedCoins;
        const timestamp = new Date().toISOString();
        const referenceId = `P1-PAY-${Date.now().toString(36).toUpperCase()}-${Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase()}`;

        // Update both `coins` and `coin_balance` to keep all wallet queries strictly in sync
        let deductError: any = null;
        const { error: dualUpdateErr } = await supabase
            .from('profiles')
            .update({
                coins: remainingCoins,
                coin_balance: remainingCoins,
            })
            .eq('id', targetUserId);

        if (dualUpdateErr) {
            const { error: singleUpdateErr } = await supabase
                .from('profiles')
                .update({ coins: remainingCoins })
                .eq('id', targetUserId);

            if (singleUpdateErr) {
                const { error: fallbackBalanceErr } = await supabase
                    .from('profiles')
                    .update({ coin_balance: remainingCoins })
                    .eq('id', targetUserId);
                deductError = fallbackBalanceErr;
            }
        }

        if (deductError) {
            console.error('[Pillar1 Payout Deduction Error]:', deductError);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to deduct verified coin balance. Please try again.',
                },
                { status: 500 }
            );
        }

        // 8. Log a pending payout record in Supabase to prevent duplicate spam & maintain audit trail
        const destinationSummary =
            payoutMethod === 'momo'
                ? `MoMo (${networkProvider}) - ${accountName} (${phoneNumber}), ${country}`
                : `Bank (${bankName}) - ${accountHolderName} (${accountNumber}${
                      routingOrIban ? ` / Routing: ${routingOrIban}` : ''
                  }), ${country}`;

        const transactionDescription = `Pillar 1 Coin Payout [${referenceId}] (PENDING): ${requestedCoins} Coins -> ${basePayoutGHS.toFixed(
            2
        )} GHS (${currencyMeta.symbol}${convertedAmount.toFixed(
            2
        )} ${selectedCurrency}) via ${destinationSummary}`;

        try {
            await supabase.from('pillar1_payouts').insert({
                reference_id: referenceId,
                user_id: targetUserId,
                coins_withdrawn: requestedCoins,
                previous_balance: dbAvailableCoins,
                remaining_balance: remainingCoins,
                base_payout_ghs: basePayoutGHS,
                selected_currency: selectedCurrency,
                converted_amount: convertedAmount,
                payout_method: payoutMethod,
                country,
                destination_details:
                    payoutMethod === 'momo'
                        ? { networkProvider, accountName, phoneNumber, country }
                        : { bankName, accountHolderName, accountNumber, routingOrIban, country },
                status: 'pending',
                created_at: timestamp,
            });
        } catch {
            // Best-effort if table migration hasn't been run yet
        }

        try {
            await supabase.from('transactions').insert({
                user_id: targetUserId,
                type: 'SPEND',
                amount: -requestedCoins,
                description: transactionDescription,
            });
        } catch (txErr) {
            console.warn('[Pillar1 Payout] Non-fatal transactions insert warning:', txErr);
        }

        try {
            await supabase.from('wallet_transactions').insert({
                user_id: targetUserId,
                reference: referenceId,
                type: 'withdrawal',
                status: 'pending',
                amount: basePayoutGHS,
                description: transactionDescription,
            });
        } catch {
            // Optional table if present in deployment
        }

        // 9. Send Structured HTML Admin Payout Notification Email via Pillar 1 Resend
        const userFullName =
            profile.full_name ||
            profile.display_name ||
            profile.name ||
            body.userFullName ||
            'HorPal User';
        const userUsername =
            profile.username || body.username || userFullName || targetUserId.slice(0, 8);
        const userEmail =
            profile.email || authEmail || body.userEmail || 'Not provided';

        const resendApiKey = process.env.RESEND_API_KEY;
        const adminEmail =
            process.env.ADMIN_CONTACT_EMAIL || 'earnmegaservice@gmail.com';

        let emailDispatched = false;

        if (resendApiKey) {
            try {
                const resend = new Resend(resendApiKey);

                const payoutDetailsRows =
                    payoutMethod === 'momo'
                        ? `
                        <tr>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Payout Method</td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #f8fafc; font-weight: 600; font-size: 13px;">Mobile Money (MoMo / M-Pesa)</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Network Provider</td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #f8fafc; font-weight: 600; font-size: 13px;">${escapeHtml(networkProvider)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Account Name</td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #f8fafc; font-weight: 600; font-size: 13px;">${escapeHtml(accountName)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Phone Number</td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #38bdf8; font-weight: 700; font-size: 14px;">${escapeHtml(phoneNumber)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; color: #94a3b8; font-size: 13px;">Country</td>
                            <td style="padding: 10px 12px; color: #f8fafc; font-weight: 600; font-size: 13px;">${escapeHtml(country)}</td>
                        </tr>
                    `
                        : `
                        <tr>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Payout Method</td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #f8fafc; font-weight: 600; font-size: 13px;">Bank Transfer / International</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Bank Name</td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #f8fafc; font-weight: 600; font-size: 13px;">${escapeHtml(bankName)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Account Holder Name</td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #f8fafc; font-weight: 600; font-size: 13px;">${escapeHtml(accountHolderName)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Account Number / IBAN</td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #38bdf8; font-weight: 700; font-size: 14px;">${escapeHtml(accountNumber)}</td>
                        </tr>
                        ${
                            routingOrIban
                                ? `<tr>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Routing / SWIFT / Sort Code</td>
                            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #f8fafc; font-weight: 600; font-size: 13px;">${escapeHtml(routingOrIban)}</td>
                        </tr>`
                                : ''
                        }
                        <tr>
                            <td style="padding: 10px 12px; color: #94a3b8; font-size: 13px;">Country</td>
                            <td style="padding: 10px 12px; color: #f8fafc; font-weight: 600; font-size: 13px;">${escapeHtml(country)}</td>
                        </tr>
                    `;

                await resend.emails.send({
                    from: 'HorPal Pillar 1 Payouts <onboarding@resend.dev>',
                    to: adminEmail,
                    subject: `💰 [Pillar 1 Payout Request] ${requestedCoins} Coins (${basePayoutGHS.toFixed(
                        2
                    )} GHS / ${currencyMeta.symbol}${convertedAmount.toFixed(
                        2
                    )} ${selectedCurrency}) - @${userUsername}`,
                    html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #090d16; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
                        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 24px 28px; border-bottom: 1px solid #1e293b;">
                            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #fbbf24; font-weight: 700; margin-bottom: 6px;">
                                HorPal Pillar 1 • Verified Coin Payout Request
                            </div>
                            <h2 style="margin: 0; font-size: 22px; color: #ffffff; font-weight: 800;">
                                ${requestedCoins.toLocaleString()} Coins → ${basePayoutGHS.toFixed(2)} GHS
                            </h2>
                            <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">
                                Reference ID: <strong style="color: #e2e8f0; font-family: monospace;">${escapeHtml(referenceId)}</strong> • ${escapeHtml(timestamp)}
                            </p>
                        </div>

                        <div style="padding: 24px 28px;">
                            <!-- Conversion Summary Banner -->
                            <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px;">
                                    50% Coin-to-Cash Conversion Summary (1 Coin = 0.50 GHS)
                                </div>
                                <div style="font-size: 18px; font-weight: 800; color: #34d399;">
                                    ${requestedCoins.toLocaleString()} Coins = ${basePayoutGHS.toFixed(2)} GHS
                                    <span style="color: #fbbf24; font-size: 15px; font-weight: 700; margin-left: 8px;">
                                        (≈ ${escapeHtml(currencyMeta.symbol)}${convertedAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })} ${escapeHtml(selectedCurrency)})
                                    </span>
                                </div>
                            </div>

                            <!-- User Identity & Verified Balance Section -->
                            <h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; margin: 0 0 10px 0;">
                                1. User Account & Verified Balance Audit
                            </h3>
                            <table style="width: 100%; border-collapse: collapse; background-color: #0f172a; border-radius: 10px; overflow: hidden; border: 1px solid #1e293b; margin-bottom: 24px;">
                                <tbody>
                                    <tr>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px; width: 42%;">User ID</td>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #f8fafc; font-family: monospace; font-size: 12px;">${escapeHtml(targetUserId)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Full Name</td>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #f8fafc; font-weight: 600; font-size: 13px;">${escapeHtml(userFullName)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Username</td>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #f8fafc; font-weight: 600; font-size: 13px;">@${escapeHtml(userUsername)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Email</td>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #38bdf8; font-size: 13px;">${escapeHtml(userEmail)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Coins Withdrawn</td>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #fbbf24; font-weight: 700; font-size: 14px;">${requestedCoins.toLocaleString()} Coins</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Previous Verified Balance</td>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #cbd5e1; font-size: 13px;">${dbAvailableCoins.toLocaleString()} Coins</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Remaining Verified Balance</td>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #34d399; font-weight: 700; font-size: 13px;">${remainingCoins.toLocaleString()} Coins (Deducted)</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;">Base Payout Amount (GHS)</td>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #34d399; font-weight: 700; font-size: 14px;">${basePayoutGHS.toFixed(2)} GHS (${requestedCoins} × 0.50 GHS)</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 12px; color: #94a3b8; font-size: 13px;">Selected Currency & Converted Payout</td>
                                        <td style="padding: 10px 12px; color: #fbbf24; font-weight: 700; font-size: 14px;">${escapeHtml(selectedCurrency)} — ${escapeHtml(currencyMeta.symbol)}${convertedAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <!-- Payout Destination Details -->
                            <h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; margin: 0 0 10px 0;">
                                2. Payout Destination Details
                            </h3>
                            <table style="width: 100%; border-collapse: collapse; background-color: #0f172a; border-radius: 10px; overflow: hidden; border: 1px solid #1e293b; margin-bottom: 20px;">
                                <tbody>
                                    ${payoutDetailsRows}
                                </tbody>
                            </table>

                            <div style="font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 14px; display: flex; justify-content: space-between;">
                                <span>Status: <strong style="color: #fbbf24;">PENDING ADMIN DISBURSEMENT</strong></span>
                                <span>Ref: ${escapeHtml(referenceId)}</span>
                            </div>
                        </div>
                    </div>
                    `,
                });
                emailDispatched = true;
            } catch (emailError) {
                console.error('[Pillar1 Payout Resend Error]:', emailError);
            }
        } else {
            console.warn(
                '[Pillar1 Payout]: RESEND_API_KEY is not configured in environment. Logged payout request:',
                {
                    referenceId,
                    adminEmail,
                    userId: targetUserId,
                    requestedCoins,
                    previousBalance: dbAvailableCoins,
                    remainingBalance: remainingCoins,
                    basePayoutGHS,
                    selectedCurrency,
                    convertedAmount,
                    destinationSummary,
                    timestamp,
                }
            );
        }

        return NextResponse.json({
            success: true,
            referenceId,
            coinsWithdrawn: requestedCoins,
            previousBalance: dbAvailableCoins,
            remainingBalance: remainingCoins,
            basePayoutGHS,
            selectedCurrency,
            convertedAmount,
            currencySymbol: currencyMeta.symbol,
            payoutMethod,
            timestamp,
            emailDispatched,
        });
    } catch (error: any) {
        console.error('[Pillar1 Payout API Fatal Error]:', error);
        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'Internal server error processing payout request',
            },
            { status: 500 }
        );
    }
}
