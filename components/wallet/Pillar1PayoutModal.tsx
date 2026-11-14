'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Coins,
    ArrowRightLeft,
    Globe,
    Smartphone,
    Building2,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { supabase } from '../../utils/supabase';
import { useAdminRealtimeEnforcement } from '../../hooks/useAdminRealtimeEnforcement';

export type SupportedPayoutCurrency =
    | 'GHS'
    | 'NGN'
    | 'KES'
    | 'ZAR'
    | 'USD'
    | 'GBP'
    | 'EUR'
    | 'CAD'
    | 'XOF';

interface CurrencyOption {
    code: SupportedPayoutCurrency;
    label: string;
    symbol: string;
    flag: string;
}

export const WORLDWIDE_PAYOUT_CURRENCIES: CurrencyOption[] = [
    { code: 'GHS', label: 'GHS - Ghana Cedi', symbol: 'GH₵', flag: '🇬🇭' },
    { code: 'NGN', label: 'NGN - Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
    { code: 'KES', label: 'KES - Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
    { code: 'ZAR', label: 'ZAR - South African Rand', symbol: 'R', flag: '🇿🇦' },
    { code: 'USD', label: 'USD - US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'GBP', label: 'GBP - British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'EUR', label: 'EUR - Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'CA$', flag: '🇨🇦' },
    { code: 'XOF', label: 'XOF - CFA Franc', symbol: 'CFA ', flag: '🌍' },
];

// Reliable offline fallback exchange rates (1 GHS -> Target Currency)
export const FALLBACK_GHS_RATES: Record<SupportedPayoutCurrency, number> = {
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

interface Pillar1PayoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface PayoutReceipt {
    referenceId: string;
    coinsWithdrawn: number;
    previousBalance: number;
    remainingBalance: number;
    basePayoutGHS: number;
    selectedCurrency: SupportedPayoutCurrency;
    convertedAmount: number;
    currencySymbol: string;
    payoutMethod: 'momo' | 'bank';
    timestamp: string;
}

export const Pillar1PayoutModal: React.FC<Pillar1PayoutModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { user, session } = useAuth();
    const { balance, setBalance, refreshWallet } = useWallet();
    const { settings: adminSettings } = useAdminRealtimeEnforcement();

    const [mounted, setMounted] = useState(false);
    const [verifiedCoins, setVerifiedCoins] = useState<number>(balance || 0);
    const [isVerifyingBalance, setIsVerifyingBalance] = useState<boolean>(false);

    // Coin input & Currency Converter state
    const [coinsInput, setCoinsInput] = useState<string>('');
    const [selectedCurrency, setSelectedCurrency] =
        useState<SupportedPayoutCurrency>('GHS');
    const [exchangeRates, setExchangeRates] =
        useState<Record<string, number>>(FALLBACK_GHS_RATES);
    const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
    const [usingLiveRates, setUsingLiveRates] = useState<boolean>(false);

    // Payout Destination Form state
    const [payoutMethod, setPayoutMethod] = useState<'momo' | 'bank'>('momo');
    const [country, setCountry] = useState<string>('Ghana');

    // Mobile Money fields
    const [networkProvider, setNetworkProvider] = useState<string>('MTN MoMo');
    const [accountName, setAccountName] = useState<string>('');
    const [phoneNumber, setPhoneNumber] = useState<string>('');

    // Bank Transfer fields
    const [bankName, setBankName] = useState<string>('');
    const [accountHolderName, setAccountHolderName] = useState<string>('');
    const [accountNumber, setAccountNumber] = useState<string>('');
    const [routingOrIban, setRoutingOrIban] = useState<string>('');

    // Submission & Receipt state
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [receipt, setReceipt] = useState<PayoutReceipt | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Sync local verifiedCoins when context balance updates
    useEffect(() => {
        if (typeof balance === 'number' && balance >= 0) {
            setVerifiedCoins(Math.floor(balance));
        }
    }, [balance]);

    // Fetch live verified coin balance from Supabase & live exchange rates when opened
    useEffect(() => {
        if (!isOpen) return;

        setErrorMessage(null);

        const fetchVerifiedBalance = async () => {
            if (!user?.id) return;
            setIsVerifyingBalance(true);
            try {
                const headers: Record<string, string> = {};
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }
                const res = await fetch(
                    `/api/pillar1/payout?userId=${encodeURIComponent(user.id)}`,
                    { headers }
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && typeof data.availableCoins === 'number') {
                        setVerifiedCoins(data.availableCoins);
                        setBalance(data.availableCoins);
                        return;
                    }
                }

                // Direct Supabase fallback query
                const { data: prof } = await supabase
                    .from('profiles')
                    .select('coins, coin_balance')
                    .eq('id', user.id)
                    .single();

                if (prof) {
                    const dbCoins =
                        typeof prof.coins === 'number' && prof.coins > 0
                            ? Math.floor(prof.coins)
                            : typeof prof.coin_balance === 'number' && prof.coin_balance > 0
                            ? Math.floor(prof.coin_balance)
                            : 0;
                    setVerifiedCoins(dbCoins);
                    setBalance(dbCoins);
                }
            } catch (err) {
                console.warn('[Pillar1PayoutModal] Balance verification check warning:', err);
            } finally {
                setIsVerifyingBalance(false);
            }
        };

        const fetchExchangeRates = async () => {
            setIsLoadingRates(true);
            try {
                const res = await fetch('https://open.er-api.com/v6/latest/GHS');
                if (res.ok) {
                    const data = await res.json();
                    if (data?.rates) {
                        setExchangeRates({
                            ...FALLBACK_GHS_RATES,
                            ...data.rates,
                            GHS: 1.0,
                        });
                        setUsingLiveRates(true);
                    }
                }
            } catch {
                // Keep FALLBACK_GHS_RATES when offline
                setUsingLiveRates(false);
            } finally {
                setIsLoadingRates(false);
            }
        };

        fetchVerifiedBalance();
        fetchExchangeRates();
    }, [isOpen, user?.id, session?.access_token, setBalance]);

    // Parse & validate coins to withdraw
    const parsedCoins = useMemo(() => {
        const trimmed = coinsInput.trim();
        if (!trimmed) return 0;
        const num = Number(trimmed);
        if (!Number.isFinite(num) || num <= 0) return 0;
        return Math.floor(num);
    }, [coinsInput]);

    const isValidCoinAmount = useMemo(() => {
        if (!coinsInput.trim()) return false;
        const rawNum = Number(coinsInput.trim());
        return (
            Number.isInteger(rawNum) &&
            rawNum >= 1 &&
            rawNum <= verifiedCoins
        );
    }, [coinsInput, verifiedCoins]);

    // Strict 50% Conversion Math: basePayoutGHS = coinsToWithdraw * 0.50
    const basePayoutGHS = useMemo(() => {
        return Number((parsedCoins * 0.5).toFixed(2));
    }, [parsedCoins]);

    const activeCurrencyMeta = useMemo(() => {
        return (
            WORLDWIDE_PAYOUT_CURRENCIES.find((c) => c.code === selectedCurrency) ||
            WORLDWIDE_PAYOUT_CURRENCIES[0]
        );
    }, [selectedCurrency]);

    const activeRate = useMemo(() => {
        if (selectedCurrency === 'GHS') return 1.0;
        return (
            exchangeRates[selectedCurrency] ||
            FALLBACK_GHS_RATES[selectedCurrency] ||
            1.0
        );
    }, [selectedCurrency, exchangeRates]);

    const convertedPayoutAmount = useMemo(() => {
        return Number((basePayoutGHS * activeRate).toFixed(2));
    }, [basePayoutGHS, activeRate]);

    // Reference previews for USD & NGN alongside selected currency
    const usdPreview = useMemo(() => {
        const rate = exchangeRates['USD'] || FALLBACK_GHS_RATES.USD;
        return (basePayoutGHS * rate).toFixed(2);
    }, [basePayoutGHS, exchangeRates]);

    const ngnPreview = useMemo(() => {
        const rate = exchangeRates['NGN'] || FALLBACK_GHS_RATES.NGN;
        return (basePayoutGHS * rate).toFixed(2);
    }, [basePayoutGHS, exchangeRates]);

    const handleCoinsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        setCoinsInput(val);
        setErrorMessage(null);
    };

    const handleQuickSelect = (fraction: number) => {
        if (verifiedCoins <= 0) return;
        const target = Math.max(1, Math.floor(verifiedCoins * fraction));
        setCoinsInput(String(target));
        setErrorMessage(null);
    };

    const handleSubmitPayout = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (adminSettings?.freeze_p1_withdrawals) {
            setErrorMessage('⏸️ Withdrawals are temporarily paused for scheduled settlement auditing.');
            return;
        }

        if (!user?.id) {
            setErrorMessage('Please sign in to submit a coin payout request.');
            return;
        }

        const requestedCoins = Number(coinsInput.trim());
        if (
            !Number.isInteger(requestedCoins) ||
            requestedCoins < 1 ||
            requestedCoins > verifiedCoins
        ) {
            setErrorMessage('Insufficient verified coin balance');
            return;
        }

        if (!country.trim()) {
            setErrorMessage('Please enter your country.');
            return;
        }

        if (payoutMethod === 'momo') {
            if (!networkProvider.trim() || !accountName.trim() || !phoneNumber.trim()) {
                setErrorMessage(
                    'Please fill in Network Provider, Account Name, Phone Number, and Country.'
                );
                return;
            }
        } else {
            if (!bankName.trim() || !accountHolderName.trim() || !accountNumber.trim()) {
                setErrorMessage(
                    'Please fill in Bank Name, Account Holder Name, Account Number / IBAN, and Country.'
                );
                return;
            }
        }

        setIsSubmitting(true);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const response = await fetch('/api/pillar1/payout', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    userId: user.id,
                    userEmail: user.email,
                    coinsToWithdraw: requestedCoins,
                    selectedCurrency,
                    exchangeRate: activeRate,
                    payoutMethod,
                    country: country.trim(),
                    networkProvider: networkProvider.trim(),
                    accountName: accountName.trim(),
                    phoneNumber: phoneNumber.trim(),
                    bankName: bankName.trim(),
                    accountHolderName: accountHolderName.trim(),
                    accountNumber: accountNumber.trim(),
                    routingOrIban: routingOrIban.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                if (typeof data.verifiedAvailableCoins === 'number') {
                    setVerifiedCoins(data.verifiedAvailableCoins);
                    setBalance(data.verifiedAvailableCoins);
                }
                setErrorMessage(data.error || 'Failed to process payout request.');
                return;
            }

            // Sync client wallet balance immediately
            setVerifiedCoins(data.remainingBalance);
            setBalance(data.remainingBalance);
            await refreshWallet();

            setReceipt({
                referenceId: data.referenceId,
                coinsWithdrawn: data.coinsWithdrawn,
                previousBalance: data.previousBalance,
                remainingBalance: data.remainingBalance,
                basePayoutGHS: data.basePayoutGHS,
                selectedCurrency: data.selectedCurrency,
                convertedAmount: data.convertedAmount,
                currencySymbol: data.currencySymbol || activeCurrencyMeta.symbol,
                payoutMethod: data.payoutMethod,
                timestamp: data.timestamp,
            });
            setCoinsInput('');
        } catch (err: any) {
            setErrorMessage(
                err?.message || 'Network error submitting payout request. Please try again.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[1000000] bg-black/85 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg bg-[#0b0f17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-100 antialiased"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0f1522]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <Coins size={17} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white tracking-tight">
                                Pillar 1 Coin Payout
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                50% Coin-to-Cash Conversion • 1 Coin = 0.50 GHS
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Close Payout Modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1">
                    {receipt ? (
                        <div className="space-y-4 py-2">
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                                <CheckCircle2
                                    size={22}
                                    className="text-emerald-400 shrink-0 mt-0.5"
                                />
                                <div>
                                    <h4 className="text-sm font-bold text-emerald-300">
                                        Payout Request Dispatched
                                    </h4>
                                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                        Your verified balance has been updated and your payout
                                        details have been sent to the HorPal Payout Desk.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-2.5 text-xs">
                                <div className="flex justify-between items-center py-1 border-b border-white/5">
                                    <span className="text-slate-400">Reference ID</span>
                                    <span className="font-mono font-semibold text-slate-200">
                                        {receipt.referenceId}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-white/5">
                                    <span className="text-slate-400">Coins Withdrawn</span>
                                    <span className="font-bold text-amber-400 tabular-nums">
                                        {receipt.coinsWithdrawn.toLocaleString()} Coins
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-white/5">
                                    <span className="text-slate-400">Base Cash Value (50%)</span>
                                    <span className="font-bold text-emerald-400 tabular-nums">
                                        {receipt.basePayoutGHS.toFixed(2)} GHS
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-white/5">
                                    <span className="text-slate-400">
                                        Converted Payout ({receipt.selectedCurrency})
                                    </span>
                                    <span className="font-bold text-white tabular-nums">
                                        {receipt.currencySymbol}
                                        {receipt.convertedAmount.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}{' '}
                                        {receipt.selectedCurrency}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-400">
                                        Remaining Verified Coins
                                    </span>
                                    <span className="font-semibold text-slate-200 tabular-nums">
                                        {receipt.remainingBalance.toLocaleString()} Coins
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setReceipt(null)}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors"
                                >
                                    New Payout
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitPayout} className="space-y-4">
                            {/* Verified Available Coins Banner */}
                            <div className="rounded-xl bg-gradient-to-r from-slate-900 via-[#111827] to-slate-900 border border-white/10 p-4 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                                        <ShieldCheck size={13} className="text-emerald-400" />
                                        <span>Available Verified Coins</span>
                                    </div>
                                    <div className="mt-1 flex items-baseline gap-2">
                                        <span className="text-2xl font-extrabold text-white tabular-nums">
                                            {verifiedCoins.toLocaleString()}
                                        </span>
                                        <span className="text-xs font-semibold text-amber-400">
                                            Coins
                                        </span>
                                        {isVerifyingBalance && (
                                            <RefreshCw
                                                size={12}
                                                className="text-slate-400 animate-spin ml-1"
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[11px] text-slate-400">
                                        Max Cash Value (50%)
                                    </div>
                                    <div className="text-sm font-bold text-emerald-400 tabular-nums mt-0.5">
                                        {(verifiedCoins * 0.5).toFixed(2)} GHS
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                        1 Coin = 0.50 GHS
                                    </div>
                                </div>
                            </div>

                            {/* Conversion Rate Rule Info */}
                            <div className="grid grid-cols-3 gap-2 text-center bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-[11px]">
                                <div className="px-2 py-1 rounded-lg bg-white/[0.02]">
                                    <div className="text-slate-400">1 Coin</div>
                                    <div className="font-bold text-slate-200 tabular-nums">
                                        0.50 GHS
                                    </div>
                                </div>
                                <div className="px-2 py-1 rounded-lg bg-white/[0.02]">
                                    <div className="text-slate-400">10 Coins</div>
                                    <div className="font-bold text-slate-200 tabular-nums">
                                        5.00 GHS
                                    </div>
                                </div>
                                <div className="px-2 py-1 rounded-lg bg-white/[0.02]">
                                    <div className="text-slate-400">100 Coins</div>
                                    <div className="font-bold text-emerald-400 tabular-nums">
                                        50.00 GHS
                                    </div>
                                </div>
                            </div>

                            {/* Coins to Withdraw Input */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-300">
                                        Coins to Withdraw
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        {[
                                            { label: '25%', val: 0.25 },
                                            { label: '50%', val: 0.5 },
                                            { label: 'MAX', val: 1 },
                                        ].map((btn) => (
                                            <button
                                                key={btn.label}
                                                type="button"
                                                disabled={verifiedCoins < 1}
                                                onClick={() => handleQuickSelect(btn.val)}
                                                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-slate-300 disabled:opacity-40 transition-colors"
                                            >
                                                {btn.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        max={Math.max(1, verifiedCoins)}
                                        step={1}
                                        value={coinsInput}
                                        onChange={handleCoinsInputChange}
                                        placeholder={
                                            verifiedCoins > 0
                                                ? `Enter coins (1 - ${verifiedCoins})`
                                                : '0 Coins available'
                                        }
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/15 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 tabular-nums"
                                    />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-400 pointer-events-none">
                                        COINS
                                    </span>
                                </div>
                                {coinsInput && parsedCoins > verifiedCoins && (
                                    <p className="text-[11px] text-rose-400 font-medium">
                                        Amount exceeds your verified balance of{' '}
                                        {verifiedCoins.toLocaleString()} Coins.
                                    </p>
                                )}
                            </div>

                            {/* Worldwide Currency Selector & Live Payout Preview */}
                            <div className="rounded-xl bg-[#111827] border border-white/10 p-3.5 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                        <Globe size={13} className="text-sky-400" />
                                        <span>Worldwide Payout Currency</span>
                                    </label>
                                    <span className="text-[10px] text-slate-400">
                                        {isLoadingRates
                                            ? 'Updating rates...'
                                            : usingLiveRates
                                            ? 'Live FX Rate'
                                            : 'Standard FX Rate'}
                                    </span>
                                </div>

                                <select
                                    value={selectedCurrency}
                                    onChange={(e) =>
                                        setSelectedCurrency(
                                            e.target.value as SupportedPayoutCurrency
                                        )
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-[#0b0f17] border border-white/15 text-xs font-semibold text-white focus:outline-none focus:border-sky-500/60"
                                >
                                    {WORLDWIDE_PAYOUT_CURRENCIES.map((curr) => (
                                        <option
                                            key={curr.code}
                                            value={curr.code}
                                            className="bg-[#0b0f17] text-white"
                                        >
                                            {curr.flag} {curr.label} ({curr.symbol})
                                        </option>
                                    ))}
                                </select>

                                {/* Dynamic Calculation Box */}
                                <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">
                                            Base Payout (50% GHS):
                                        </span>
                                        <span className="font-bold text-emerald-400 tabular-nums">
                                            {parsedCoins.toLocaleString()} Coins ={' '}
                                            {basePayoutGHS.toFixed(2)} GHS
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                                        <span className="text-slate-300 font-medium flex items-center gap-1">
                                            <ArrowRightLeft
                                                size={12}
                                                className="text-amber-400"
                                            />
                                            Converted ({selectedCurrency}):
                                        </span>
                                        <span className="text-sm font-extrabold text-amber-300 tabular-nums">
                                            {activeCurrencyMeta.symbol}
                                            {convertedPayoutAmount.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}{' '}
                                            {selectedCurrency}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 pt-1 tabular-nums">
                                        {parsedCoins > 0 ? (
                                            <>
                                                {parsedCoins.toLocaleString()} Coins ={' '}
                                                <span className="text-slate-200 font-semibold">
                                                    {basePayoutGHS.toFixed(2)} GHS
                                                </span>{' '}
                                                (≈ ${usdPreview} USD / ₦
                                                {Number(ngnPreview).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}{' '}
                                                NGN)
                                            </>
                                        ) : (
                                            <>
                                                Example: 10 Coins = 5.00 GHS (≈ $
                                                {(
                                                    5 *
                                                    (exchangeRates['USD'] ||
                                                        FALLBACK_GHS_RATES.USD)
                                                ).toFixed(2)}{' '}
                                                USD / ₦
                                                {(
                                                    5 *
                                                    (exchangeRates['NGN'] ||
                                                        FALLBACK_GHS_RATES.NGN)
                                                ).toFixed(2)}{' '}
                                                NGN)
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Payout Destination Details Form */}
                            <div className="space-y-3 pt-1">
                                <label className="text-xs font-semibold text-slate-300 block">
                                    Payout Destination Method
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPayoutMethod('momo')}
                                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                                            payoutMethod === 'momo'
                                                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                                                : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Smartphone size={14} />
                                        <span>Mobile Money</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPayoutMethod('bank')}
                                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                                            payoutMethod === 'bank'
                                                ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                                                : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Building2 size={14} />
                                        <span>Bank / Int&apos;l</span>
                                    </button>
                                </div>

                                {payoutMethod === 'momo' ? (
                                    <div className="space-y-2.5 bg-white/[0.02] border border-white/10 rounded-xl p-3.5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[11px] text-slate-400 mb-1">
                                                    Network Provider
                                                </label>
                                                <select
                                                    value={networkProvider}
                                                    onChange={(e) =>
                                                        setNetworkProvider(e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 rounded-lg bg-[#0b0f17] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-500/50"
                                                >
                                                    <option value="MTN MoMo">MTN MoMo</option>
                                                    <option value="Telecel Cash (Vodafone)">
                                                        Telecel Cash (Vodafone)
                                                    </option>
                                                    <option value="AT Money (AirtelTigo)">
                                                        AT Money (AirtelTigo)
                                                    </option>
                                                    <option value="M-Pesa">M-Pesa</option>
                                                    <option value="Wave Mobile Money">
                                                        Wave Mobile Money
                                                    </option>
                                                    <option value="Orange Money">
                                                        Orange Money
                                                    </option>
                                                    <option value="Other Mobile Money">
                                                        Other Mobile Money
                                                    </option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] text-slate-400 mb-1">
                                                    Country
                                                </label>
                                                <input
                                                    type="text"
                                                    value={country}
                                                    onChange={(e) => setCountry(e.target.value)}
                                                    placeholder="e.g. Ghana, Kenya, Nigeria"
                                                    className="w-full px-3 py-2 rounded-lg bg-[#0b0f17] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-slate-400 mb-1">
                                                Registered Account Name
                                            </label>
                                            <input
                                                type="text"
                                                value={accountName}
                                                onChange={(e) => setAccountName(e.target.value)}
                                                placeholder="Full name on Mobile Money wallet"
                                                className="w-full px-3 py-2 rounded-lg bg-[#0b0f17] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-slate-400 mb-1">
                                                Mobile Money Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                placeholder="e.g. +233 24 000 0000"
                                                className="w-full px-3 py-2 rounded-lg bg-[#0b0f17] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 tabular-nums"
                                                required
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5 bg-white/[0.02] border border-white/10 rounded-xl p-3.5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[11px] text-slate-400 mb-1">
                                                    Bank Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={bankName}
                                                    onChange={(e) => setBankName(e.target.value)}
                                                    placeholder="e.g. Ecobank, GTBank, Chase"
                                                    className="w-full px-3 py-2 rounded-lg bg-[#0b0f17] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] text-slate-400 mb-1">
                                                    Country
                                                </label>
                                                <input
                                                    type="text"
                                                    value={country}
                                                    onChange={(e) => setCountry(e.target.value)}
                                                    placeholder="e.g. Ghana, Nigeria, UK, USA"
                                                    className="w-full px-3 py-2 rounded-lg bg-[#0b0f17] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-slate-400 mb-1">
                                                Account Holder Name
                                            </label>
                                            <input
                                                type="text"
                                                value={accountHolderName}
                                                onChange={(e) =>
                                                    setAccountHolderName(e.target.value)
                                                }
                                                placeholder="Full legal name on bank account"
                                                className="w-full px-3 py-2 rounded-lg bg-[#0b0f17] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[11px] text-slate-400 mb-1">
                                                    Account Number / IBAN
                                                </label>
                                                <input
                                                    type="text"
                                                    value={accountNumber}
                                                    onChange={(e) =>
                                                        setAccountNumber(e.target.value)
                                                    }
                                                    placeholder="Account Number or IBAN"
                                                    className="w-full px-3 py-2 rounded-lg bg-[#0b0f17] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 tabular-nums"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] text-slate-400 mb-1">
                                                    Routing / SWIFT / Sort Code
                                                </label>
                                                <input
                                                    type="text"
                                                    value={routingOrIban}
                                                    onChange={(e) =>
                                                        setRoutingOrIban(e.target.value)
                                                    }
                                                    placeholder="Optional for local banks"
                                                    className="w-full px-3 py-2 rounded-lg bg-[#0b0f17] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {adminSettings?.freeze_p1_withdrawals && (
                                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center gap-2.5 text-xs font-bold text-amber-200">
                                    <AlertCircle size={16} className="shrink-0 text-amber-400" />
                                    <span>⏸️ Withdrawals are temporarily paused for scheduled settlement auditing.</span>
                                </div>
                            )}

                            {errorMessage && (
                                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                                    <AlertCircle size={15} className="shrink-0 text-rose-400" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || !isValidCoinAmount || Boolean(adminSettings?.freeze_p1_withdrawals)}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Verifying Balance & Submitting...</span>
                                    </>
                                ) : parsedCoins > 0 ? (
                                    <span>
                                        Withdraw {parsedCoins.toLocaleString()} Coins (
                                        {basePayoutGHS.toFixed(2)} GHS /{' '}
                                        {activeCurrencyMeta.symbol}
                                        {convertedPayoutAmount.toFixed(2)} {selectedCurrency})
                                    </span>
                                ) : (
                                    <span>Submit Verified Coin Payout</span>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
