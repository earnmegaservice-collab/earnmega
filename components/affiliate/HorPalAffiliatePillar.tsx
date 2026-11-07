"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Copy, 
  Check, 
  ExternalLink, 
  Award, 
  BookOpen, 
  Send, 
  Zap, 
  Lock, 
  ShoppingBag, 
  BarChart3, 
  Users, 
  Calculator, 
  Share2, 
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// ============================================================================
// PLATFORM CONFIGURATION & CONSTANTS
// ============================================================================
const DIRECT_ENTRY_FEE_GHS = 90.00; // Constant GHS 90 for direct non-product affiliate signup
const DEFAULT_COMMISSION_RATE = 50; // 50% Flat Commission
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

const SUPPORT_EMAIL_PRIMARY = "horpalservice@gmail.com";
const SUPPORT_EMAIL_SECONDARY = "geestablish@gmail.com";
const SUPPORT_WHATSAPP = "0534761381";

interface CurrencyRate {
  code: string;
  symbol: string;
  rateToGHS: number; // 1 Unit of Currency = X GHS
  label: string;
}

const CURRENCIES: Record<string, CurrencyRate> = {
  GHS: { code: 'GHS', symbol: 'GH₵', rateToGHS: 1.0, label: 'Ghana Cedi (Settlement)' },
  USD: { code: 'USD', symbol: '$', rateToGHS: 16.0, label: 'US Dollar' },
  NGN: { code: 'NGN', symbol: '₦', rateToGHS: 0.010, label: 'Nigerian Naira' },
  GBP: { code: 'GBP', symbol: '£', rateToGHS: 20.0, label: 'British Pound' },
  EUR: { code: 'EUR', symbol: '€', rateToGHS: 17.2, label: 'Euro' },
  KES: { code: 'KES', symbol: 'KSh', rateToGHS: 0.12, label: 'Kenyan Shilling' },
};

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  priceUSD: number;
  priceGHS: number;
  commissionRate: number;
  salesPageUrl?: string;
  accessUrl: string;
  swipeCopy: {
    tiktok: string[];
    whatsapp: string[];
  };
}

const PRODUCTS_DATABASE: Product[] = [
  {
    id: "prod_faceless_ai",
    title: "The AI Faceless Video Engine",
    slug: "ai-faceless-video-engine",
    category: "AI Video Automation",
    priceUSD: 15,
    priceGHS: 240.00,
    commissionRate: 50,
    salesPageUrl: "https://ai-faceless-video-engine-access-por.vercel.app",
    accessUrl: "https://drive.google.com/drive/folders/1IhgiK8DYCM8d-a82uImfds_gS4s06D8wvs7WypmFbjE",
    description: "Complete blueprint and automation prompt stack to build, scale, and monetize faceless TikTok, Reels, and YouTube channels without ever showing your face.",
    swipeCopy: {
      tiktok: [
        "How creators are generating automated income with faceless AI videos in 90 seconds without filming themselves. Blueprint in bio! #aivideo #facelesschannel #horpal",
        "Stop spending 6 hours editing videos. This AI Faceless Video Engine builds high-retention clips on autopilot. Link in bio!"
      ],
      whatsapp: [
        "Hey! I just got access to The AI Faceless Video Engine. It shows you how to run profitable faceless TikTok & YouTube channels with AI. Check it out here: {LINK}",
        "Want to monetize short-form video without showing your face on camera? Grab The AI Faceless Video Engine + full HorPal Affiliate access here: {LINK}"
      ]
    }
  },
  {
    id: "prod_mmm_system",
    title: "The Mega Messaging Machine (MMM)",
    slug: "mega-messaging-machine",
    category: "Sales & Conversion",
    priceUSD: 15,
    priceGHS: 240.00,
    commissionRate: 50,
    salesPageUrl: "https://ai-faceless-video-engine-access-por.vercel.app",
    accessUrl: "https://drive.google.com/drive/folders/1o7KrzMponCFxIHvCtvJtr1liyAfC-X3qKDkWrFzPWws",
    description: "High-converting WhatsApp, Instagram, and DM closing scripts engineered to turn cold prospects into daily buyers without sounding pushy.",
    swipeCopy: {
      tiktok: [
        "Why prospects ghost you after asking 'How much?' and the exact WhatsApp script that closes 8 out of 10 leads. Link in bio! #salesscripts #whatsappbusiness",
        "Turn your DMs into an automated cash machine with The Mega Messaging Machine. Full access in bio!"
      ],
      whatsapp: [
        "Tired of people viewing your status or asking for prices and disappearing? The Mega Messaging Machine (MMM) fixes your DM conversions immediately: {LINK}",
        "Copy-paste these exact DM and WhatsApp closing scripts to double your daily sales: {LINK}"
      ]
    }
  },
  {
    id: "prod_day_trading",
    title: "Day Trading Beginner's Roadmap",
    slug: "day-trading-beginners-roadmap",
    category: "Financial Markets",
    priceUSD: 12,
    priceGHS: 192.00,
    commissionRate: 50,
    accessUrl: "https://drive.google.com/drive/folders/1zbDb8kAk-0Tf_SVX2vQUiUDm6NrW_LN33dOv7mLdqzA",
    description: "Step-by-step mastery of market structure, sniper entry confirmations, risk management rules, and trading psychology for beginners.",
    swipeCopy: {
      tiktok: [
        "Stop blowing trading accounts because of bad entries. Here is the Day Trading Beginner's Roadmap every new trader needs. Link in bio! #daytrading #forexghana",
        "Master chart structure and sniper risk management from scratch. Full roadmap linked in bio!"
      ],
      whatsapp: [
        "If you want to learn day trading the right way without gambling your capital, study this complete Beginner's Roadmap: {LINK}",
        "Learn institutional chart reading, stop-loss discipline, and daily trade setups here: {LINK}"
      ]
    }
  },
  {
    id: "prod_snapsell",
    title: "SnapSell: Rapid Digital Product Blueprint",
    slug: "snapsell-blueprint",
    category: "Digital Products",
    priceUSD: 18,
    priceGHS: 288.00,
    commissionRate: 50,
    accessUrl: "https://drive.google.com/drive/folders/1IhgiK8DYCM8d-a82uImfds_gS4s06D8wvs7WypmFbjE",
    description: "Package, price, and launch high-margin digital products in under 48 hours with ready-made funnel templates and instant delivery workflows.",
    swipeCopy: {
      tiktok: [
        "Create once, sell 1,000 times. How to package your knowledge into a digital product in 48 hours using SnapSell! #digitalproducts #snapsell",
        "The fastest way to launch a digital asset that pays you daily in Cedis and Dollars. Link in bio!"
      ],
      whatsapp: [
        "Want to launch your own digital product and keep 100% of the profit? See the SnapSell Rapid Blueprint here: {LINK}",
        "How to build and automate a digital product funnel this weekend: {LINK}"
      ]
    }
  },
  {
    id: "prod_status_cash",
    title: "WhatsApp Status Cash Machine",
    slug: "whatsapp-status-cash-machine",
    category: "Direct Sales",
    priceUSD: 10,
    priceGHS: 160.00,
    commissionRate: 50,
    accessUrl: "https://drive.google.com/drive/folders/1o7KrzMponCFxIHvCtvJtr1liyAfC-X3qKDkWrFzPWws",
    description: "24-hour WhatsApp status storytelling sequences, curiosity hooks, and social proof frameworks that turn silent viewers into buyers.",
    swipeCopy: {
      tiktok: [
        "Your WhatsApp status views are worth real money if you post this 3-slide sequence. Link in bio! #whatsappstatus #ghanabusiness",
        "Stop posting memes on your status. Post this 24-hour sequence instead and watch orders roll in!"
      ],
      whatsapp: [
        "Turn your WhatsApp status viewers into paying customers every single day with this status sequence vault: {LINK}",
        "Here is how top affiliates turn 100 status views into daily commissions: {LINK}"
      ]
    }
  },
  {
    id: "prod_ai_agency",
    title: "AI Freelancing & Remote Dollar Agency Blueprint",
    slug: "ai-remote-dollar-agency",
    category: "Agency & Freelancing",
    priceUSD: 20,
    priceGHS: 320.00,
    commissionRate: 50,
    accessUrl: "https://drive.google.com/drive/folders/1IhgiK8DYCM8d-a82uImfds_gS4s06D8wvs7WypmFbjE",
    description: "Land international retainer clients paying in USD while fulfilling copywriting, video, and marketing deliverables in minutes using AI.",
    swipeCopy: {
      tiktok: [
        "Live in Ghana or Nigeria, earn in US Dollars using AI fulfillment systems. Full Remote Dollar Agency Blueprint in bio! #remotework #aifreelancing",
        "How to land $500/month foreign retainer clients without coding. Link in bio!"
      ],
      whatsapp: [
        "Ready to earn in USD from home using AI tools to fulfill client work? Check out the AI Remote Dollar Agency Blueprint: {LINK}",
        "Step-by-step client acquisition and AI service delivery system: {LINK}"
      ]
    }
  }
];

export default function HorPalAffiliatePillar({
  currentProfile,
  onRefreshProfile
}: {
  currentProfile?: any;
  onRefreshProfile?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'dashboard' | 'vault' | 'calculator' | 'payouts' | 'vendor' | 'academy' | 'leaderboard'>('marketplace');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GHS');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Authenticated user & Supabase state
  const [userId, setUserId] = useState<string | null>(currentProfile?.id || null);
  const [userEmail, setUserEmail] = useState<string>(currentProfile?.email || '');
  const [userName, setUserName] = useState<string>(currentProfile?.name || currentProfile?.username || 'HorPal Affiliate');
  const [userAffiliateCode, setUserAffiliateCode] = useState<string>(currentProfile?.affiliate_code || 'HP-LOADING');
  const [isPillar2Paid, setIsPillar2Paid] = useState<boolean>(true); // TEST MODE BYPASS
  const [unlockedProducts, setUnlockedProducts] = useState<string[]>([]);

  // Referral / Bundle checkout query state (if buyer clicked an affiliate product link)
  const [incomingRefCode, setIncomingRefCode] = useState<string | null>(null);
  const [incomingProductId, setIncomingProductId] = useState<string | null>(null);

  // Financial ledger state
  const [totalEarningsGHS, setTotalEarningsGHS] = useState<number>(0);
  const [pendingBalanceGHS, setPendingBalanceGHS] = useState<number>(Number(currentProfile?.affiliate_balance || 0));
  const [withdrawnBalanceGHS, setWithdrawnBalanceGHS] = useState<number>(Number(currentProfile?.total_withdrawn || 0));
  const [totalSalesCount, setTotalSalesCount] = useState<number>(0);

  // Real transaction log from Supabase
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    reference: string;
    productTitle: string;
    amountGHS: number;
    commissionGHS: number;
    buyerEmail: string;
    date: string;
    status: string;
  }>>([]);

  // Built-in Sales Page Modal for products without an external URL (e.g. Product 3)
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Calculator state
  const [calcSelectedProductId, setCalcSelectedProductId] = useState<string>(PRODUCTS_DATABASE[0].id);
  const [calcDailySales, setCalcDailySales] = useState<number>(3);

  // Friday Payout state
  const [payoutChannel, setPayoutChannel] = useState<'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CRYPTO_USDT'>('MOBILE_MONEY');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [momoNumber, setMomoNumber] = useState<string>('');
  const [momoNetwork, setMomoNetwork] = useState<string>('MTN');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('GCB Bank');
  const [usdtAddress, setUsdtAddress] = useState<string>('');
  const [payoutAmountGHS, setPayoutAmountGHS] = useState<string>('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState<boolean>(false);
  const [payoutStatusMessage, setPayoutStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Vendor Whitelist form state
  const [vendorProductName, setVendorProductName] = useState('');
  const [vendorProductDesc, setVendorProductDesc] = useState('');
  const [vendorPriceGHS, setVendorPriceGHS] = useState('');
  const [vendorProofUrl, setVendorProofUrl] = useState('');
  const [vendorStatusMsg, setVendorStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isFridayGMT = useMemo(() => new Date().getUTCDay() === 5, []);

  // Load URL referral params & user profile/ledger from Supabase
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref');
      const prodParam = params.get('prod');
      if (refParam) {
        localStorage.setItem('horpal_affiliate_ref', refParam);
        setIncomingRefCode(refParam);
      } else {
        const savedRef = localStorage.getItem('horpal_affiliate_ref');
        if (savedRef) setIncomingRefCode(savedRef);
      }
      if (prodParam) {
        localStorage.setItem('horpal_affiliate_prod', prodParam);
        setIncomingProductId(prodParam);
      }
    }
    loadAffiliateData();
  }, [currentProfile]);

  const loadAffiliateData = async () => {
    try {
      let activeUserId = currentProfile?.id;
      let activeEmail = currentProfile?.email;

      if (!activeUserId) {
        const { data: authData } = await supabase.auth.getUser();
        activeUserId = authData?.user?.id;
        activeEmail = authData?.user?.email || '';
      }

      if (!activeUserId) return;
      setUserId(activeUserId);
      if (activeEmail) setUserEmail(activeEmail);

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, username, name, email, is_pillar2_paid, affiliate_code, affiliate_balance, total_withdrawn')
        .eq('id', activeUserId)
        .single();

      if (profileRow) {
        setUserName(profileRow.name || profileRow.username || 'HorPal Affiliate');
        setUserEmail(profileRow.email || activeEmail || '');
        setUserAffiliateCode(profileRow.affiliate_code || `HP-${activeUserId.slice(0, 6).toUpperCase()}`);
        setIsPillar2Paid(Boolean(profileRow.is_pillar2_paid));
        setPendingBalanceGHS(Number(profileRow.affiliate_balance || 0));
        setWithdrawnBalanceGHS(Number(profileRow.total_withdrawn || 0));
      }

      // Fetch sales where this user was the referring affiliate OR the buyer
      const { data: salesRows } = await supabase
        .from('affiliate_sales')
        .select('*')
        .or(`affiliate_id.eq.${activeUserId},affiliate_user_id.eq.${activeUserId},buyer_id.eq.${activeUserId},buyer_user_id.eq.${activeUserId}`)
        .order('created_at', { ascending: false });

      if (salesRows) {
        const myAffiliateSales = salesRows.filter(
          (r: any) => r.affiliate_id === activeUserId || r.affiliate_user_id === activeUserId
        );
        const myPurchases = salesRows
          .filter((r: any) => r.buyer_id === activeUserId || r.buyer_user_id === activeUserId)
          .map((r: any) => r.product_id);

        setUnlockedProducts(myPurchases);
        setTotalSalesCount(myAffiliateSales.length);

        const totalComm = myAffiliateSales.reduce(
          (sum: number, r: any) => sum + Number(r.commission_ghs || 0),
          0
        );
        setTotalEarningsGHS(totalComm);

        setTransactions(
          myAffiliateSales.map((r: any) => ({
            id: r.id,
            reference: r.paystack_reference,
            productTitle: r.product_title || r.product_name || 'Digital Asset',
            amountGHS: Number(r.gross_amount_ghs || r.amount_paid_ghs || 0),
            commissionGHS: Number(r.commission_ghs || 0),
            buyerEmail: r.buyer_email || 'verified@horpal.com',
            date: new Date(r.created_at).toISOString().replace('T', ' ').substring(0, 16),
            status: (r.status || 'COMPLETED').toUpperCase()
          }))
        );
      }
    } catch (err) {
      console.error('Error loading Pillar 2 data:', err);
    }
  };

  // Currency formatting helper (All values stored in GHS, displayed in selected currency)
  const formatCurrency = (amountGHS: number): string => {
    const target = CURRENCIES[selectedCurrency] || CURRENCIES.GHS;
    const converted = amountGHS / target.rateToGHS;
    return `${target.symbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Real Paystack Checkout Loader (Direct GHS 90 Entry OR Affiliate Product Bundle)
  const triggerPaystackCheckout = (options: {
    amountGHS: number;
    productId: string;
    productTitle: string;
    accessUrl: string;
    commissionGHS: number;
  }) => {
    if (typeof window === 'undefined') return;

    const executePopup = () => {
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) {
        alert('Paystack SDK is still loading. Please check your connection and try again.');
        return;
      }

      const ref = `HP_P2_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const activeRefCode = incomingRefCode || localStorage.getItem('horpal_affiliate_ref') || 'DIRECT';

      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: userEmail || 'buyer@horpal.com',
        amount: Math.round(options.amountGHS * 100), // GHS in pesewas
        currency: 'GHS',
        ref,
        callback: async (response: any) => {
          try {
            await supabase.rpc('record_verified_affiliate_sale', {
              p_paystack_ref: response.reference || ref,
              p_product_id: options.productId,
              p_product_title: options.productTitle,
              p_buyer_user_id: userId,
              p_buyer_name: userName,
              p_buyer_email: userEmail || 'buyer@horpal.com',
              p_affiliate_code: activeRefCode,
              p_sub_id: 'pillar2',
              p_gross_ghs: options.amountGHS,
              p_gross_usd: Number((options.amountGHS / 16).toFixed(2)),
              p_commission_ghs: options.commissionGHS,
              p_commission_usd: Number((options.commissionGHS / 16).toFixed(2)),
              p_delivery_url: options.accessUrl
            });

            if (userId) {
              await supabase.from('profiles').update({ is_pillar2_paid: true }).eq('id', userId);
            }

            setIsPillar2Paid(true);
            await loadAffiliateData();
            onRefreshProfile?.();

            if (options.accessUrl && options.productId !== 'pillar2_direct_90') {
              alert(`Payment verified! Your product and Pillar 2 Affiliate Portal are now unlocked.`);
              window.open(options.accessUrl, '_blank');
            } else {
              alert('Welcome to HorPal Pillar 2! Your Affiliate Command Center is now unlocked.');
            }
          } catch (err) {
            console.error('Verification error:', err);
          }
        }
      });

      handler.openIframe();
    };

    if (!(window as any).PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = executePopup;
      document.body.appendChild(script);
    } else {
      executePopup();
    }
  };

  // Handle Friday Payout Submission (Supabase + Resend Email to horpalservice@gmail.com)
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutStatusMessage(null);

    if (!isFridayGMT) {
      setPayoutStatusMessage({
        type: 'error',
        text: 'Withdrawals open strictly on Fridays (GMT). Keep building your balance until Friday!'
      });
      return;
    }

    const amount = parseFloat(payoutAmountGHS);
    if (isNaN(amount) || amount < 90) {
      setPayoutStatusMessage({ type: 'error', text: 'Minimum Friday withdrawal amount is GH₵ 90.00.' });
      return;
    }

    if (amount > pendingBalanceGHS) {
      setPayoutStatusMessage({
        type: 'error',
        text: `Insufficient available balance. You have ${formatCurrency(pendingBalanceGHS)}.`
      });
      return;
    }

    const networkOrBank =
      payoutChannel === 'MOBILE_MONEY'
        ? momoNetwork
        : payoutChannel === 'BANK_TRANSFER'
        ? bankName
        : 'USDT (TRC20)';

    const accountNum =
      payoutChannel === 'MOBILE_MONEY'
        ? momoNumber
        : payoutChannel === 'BANK_TRANSFER'
        ? bankAccount
        : usdtAddress;

    if (!accountHolderName || !accountNum) {
      setPayoutStatusMessage({ type: 'error', text: 'Please provide your full account name and account/wallet number.' });
      return;
    }

    setIsSubmittingPayout(true);
    try {
      if (userId) {
        await supabase.from('affiliate_payouts').insert({
          user_id: userId,
          amount_ghs: amount,
          payout_method: payoutChannel,
          account_name: accountHolderName,
          account_number: accountNum,
          bank_or_network: networkOrBank
        });

        await supabase
          .from('profiles')
          .update({
            affiliate_balance: pendingBalanceGHS - amount,
            total_withdrawn: withdrawnBalanceGHS + amount
          })
          .eq('id', userId);
      }

      const res = await fetch('/api/affiliate/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PAYOUT_REQUEST',
          payload: {
            affiliateName: `${userName} (${accountHolderName})`,
            affiliateEmail: userEmail,
            amount,
            payoutChannel,
            accountDetails: `${networkOrBank} - ${accountNum} (Account Name: ${accountHolderName})`
          }
        })
      });

      const data = await res.json();
      setPendingBalanceGHS((prev) => prev - amount);
      setWithdrawnBalanceGHS((prev) => prev + amount);
      setPayoutAmountGHS('');

      setPayoutStatusMessage({
        type: 'success',
        text: data.success
          ? `Friday payout request for ${formatCurrency(amount)} sent to HorPal Admin (${SUPPORT_EMAIL_PRIMARY}) for Paystack OTP transfer!`
          : `Payout request for ${formatCurrency(amount)} recorded for Friday disbursement!`
      });
    } catch (err) {
      setPayoutStatusMessage({
        type: 'error',
        text: 'Could not submit payout request. Please verify your connection.'
      });
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // Handle Digitstem-Style Vendor Whitelist Application
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendorStatusMsg(null);

    if (!vendorProductName || !vendorProductDesc || !vendorPriceGHS || !vendorProofUrl) {
      setVendorStatusMsg({ type: 'error', text: 'Please fill in all mandatory fields.' });
      return;
    }

    try {
      await fetch('/api/affiliate/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'VENDOR_APPLICATION',
          payload: {
            userName,
            userEmail,
            productName: vendorProductName,
            description: vendorProductDesc,
            proposedPrice: vendorPriceGHS,
            proofUrl: vendorProofUrl
          }
        })
      });
      setVendorStatusMsg({
        type: 'success',
        text: `Application sent to ${SUPPORT_EMAIL_PRIMARY}! Once approved, you will receive a congratulations email with the vendor listing fee details to unlock your Creator Desk.`
      });
      setVendorProductName('');
      setVendorProductDesc('');
      setVendorPriceGHS('');
      setVendorProofUrl('');
    } catch (err) {
      setVendorStatusMsg({
        type: 'error',
        text: `Please email your product details directly to ${SUPPORT_EMAIL_PRIMARY}.`
      });
    }
  };

  // Profit calculator math
  const calculatedProduct = useMemo(() => {
    return PRODUCTS_DATABASE.find((p) => p.id === calcSelectedProductId) || PRODUCTS_DATABASE[0];
  }, [calcSelectedProductId]);

  const calcCommissionPerSaleGHS = (calculatedProduct.priceGHS * calculatedProduct.commissionRate) / 100;
  const calcDailyRevenueGHS = calcCommissionPerSaleGHS * calcDailySales;
  const calcMonthlyRevenueGHS = calcDailyRevenueGHS * 30;
  const calcYearlyRevenueGHS = calcDailyRevenueGHS * 365;

  const bundledProduct = useMemo(() => {
    if (!incomingProductId) return null;
    return PRODUCTS_DATABASE.find((p) => p.id === incomingProductId || p.slug === incomingProductId) || null;
  }, [incomingProductId]);

  // ============================================================================
  // SEPARATE PILLAR 2 ENTRY PAYWALL (DIRECT GHS 90 OR AFFILIATE PRODUCT BUNDLE)
  // ============================================================================
  if (!isPillar2Paid) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#E5E0D8] flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-lg w-full bg-[#0F0F0F] border border-[#D4AF37]/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#D4AF37] via-[#AA7C11] to-[#593E00] p-0.5 flex items-center justify-center mx-auto mb-5">
            <div className="h-full w-full bg-[#080808] rounded-[10px] flex items-center justify-center">
              <Lock className="h-6 w-6 text-[#D4AF37]" />
            </div>
          </div>

          <span className="text-[10px] font-mono uppercase bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1 rounded border border-[#D4AF37]/30">
            HorPal Pillar 2 • Separate Access Gate
          </span>

          {bundledProduct ? (
            <>
              <h1 className="text-2xl font-serif font-bold text-white mt-4">
                {bundledProduct.title} + Free Affiliate Portal Access
              </h1>
              <p className="text-xs text-[#8C8275] mt-2 leading-relaxed">
                You were invited via affiliate code <span className="text-[#D4AF37] font-mono font-bold">{incomingRefCode || 'PARTNER'}</span>. Purchasing this product unlocks both instant Google Drive course delivery and full access to the HorPal Pillar 2 Affiliate Marketplace.
              </p>
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 my-6">
                <span className="text-[10px] font-mono uppercase text-[#8C8275] block">Product + Affiliate Bundle</span>
                <span className="text-3xl font-serif font-bold text-[#D4AF37] mt-1 block">
                  GH₵ {bundledProduct.priceGHS.toFixed(2)} <span className="text-xs text-[#8C8275]">(${bundledProduct.priceUSD})</span>
                </span>
              </div>
              <button
                onClick={() =>
                  triggerPaystackCheckout({
                    amountGHS: bundledProduct.priceGHS,
                    productId: bundledProduct.id,
                    productTitle: bundledProduct.title,
                    accessUrl: bundledProduct.accessUrl,
                    commissionGHS: (bundledProduct.priceGHS * bundledProduct.commissionRate) / 100
                  })
                }
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:opacity-90 text-black font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all"
              >
                Buy Product & Unlock Pillar 2 (GH₵ {bundledProduct.priceGHS})
              </button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-serif font-bold text-white mt-4">
                Unlock HorPal Affiliate Command Center
              </h1>
              <p className="text-xs text-[#8C8275] mt-2 leading-relaxed">
                Direct registration grants lifetime access to the Pillar 2 Affiliate Marketplace, 50% instant commission links, promotional swipe vaults, and Friday Mobile Money/Bank payouts. (Note: Direct registration unlocks the affiliate side only, without a bundled course.)
              </p>
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 my-6">
                <span className="text-[10px] font-mono uppercase text-[#8C8275] block">Direct Affiliate Registration Fee</span>
                <span className="text-3xl font-serif font-bold text-[#D4AF37] mt-1 block">
                  GH₵ {DIRECT_ENTRY_FEE_GHS.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() =>
                  triggerPaystackCheckout({
                    amountGHS: DIRECT_ENTRY_FEE_GHS,
                    productId: 'pillar2_direct_90',
                    productTitle: 'HorPal Pillar 2 Direct Affiliate Enrollment',
                    accessUrl: '',
                    commissionGHS: incomingRefCode ? DIRECT_ENTRY_FEE_GHS * 0.5 : 0
                  })
                }
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:opacity-90 text-black font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all"
              >
                Pay GH₵ 90.00 via Paystack to Unlock Pillar 2
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://horpal.com';

  return (
    <div className="min-h-screen bg-[#080808] text-[#E5E0D8] font-sans antialiased selection:bg-[#D4AF37] selection:text-[#080808]">
      
      {/* LUXURY TOP HEADER BAR */}
      <header className="sticky top-0 z-50 bg-[#0D0D0D]/90 backdrop-blur-md border-b border-[#D4AF37]/20 px-4 lg:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#D4AF37] via-[#AA7C11] to-[#593E00] p-0.5 flex items-center justify-center shadow-lg shadow-[#D4AF37]/10">
              <div className="h-full w-full bg-[#080808] rounded-[7px] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-[#D4AF37]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif text-lg font-bold tracking-wider text-white">HORPAL</span>
                <span className="text-[10px] font-mono uppercase bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/30">Pillar 2</span>
                <button
                  onClick={() => setIsPillar2Paid(!isPillar2Paid)}
                  className="ml-4 text-[10px] font-mono bg-red-900/50 text-red-200 px-2 py-0.5 rounded border border-red-500/50 hover:bg-red-800/80 transition-colors"
                >
                  [Test Mode: Toggle Paid Status]
                </button>
              </div>
              <p className="text-xs text-[#8C8275] tracking-widest uppercase">Luxury Affiliate Marketing Engine</p>
            </div>
          </div>

          {/* GLOBAL CURRENCY SELECTOR (SETTLES IN GHS) & AFFILIATE ID */}
          <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
            <div className="flex items-center space-x-2 bg-[#141414] border border-[#262626] rounded-md px-3 py-1.5">
              <DollarSign className="h-4 w-4 text-[#D4AF37]" />
              <select 
                value={selectedCurrency} 
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="bg-transparent text-xs text-[#E5E0D8] font-mono focus:outline-none cursor-pointer"
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#141414] text-white">
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-[#141414] border border-[#262626] rounded-md px-3 py-1.5 text-xs text-[#8C8275]">
              <span>ID:</span>
              <span className="font-mono text-[#D4AF37] font-semibold">{userAffiliateCode}</span>
            </div>
          </div>

        </div>
      </header>

      {/* HERO SECTION WITH METRICS OVERVIEW */}
      <section className="border-b border-[#1F1F1F] bg-gradient-to-b from-[#0D0D0D] to-[#080808] px-4 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif text-white tracking-wide">
                Welcome, {userName}
              </h1>
              <p className="text-sm text-[#8C8275] mt-1">
                Promote verified digital products with instant 50% commission crediting and Friday Paystack settlements in GH₵.
              </p>
            </div>
            
            <div className="flex items-center space-x-2 bg-[#D4AF37]/5 border border-[#D4AF37]/20 px-3 py-1.5 rounded-full text-xs text-[#D4AF37]">
              <ShieldCheck className="h-4 w-4" />
              <span>Auto-Approved Affiliate • Instant 50% Split</span>
            </div>
          </div>

          {/* FINANCIAL STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-[#121212] border border-[#242424] rounded-xl p-5 hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#8C8275]">
                <span>Total Cumulative Earnings</span>
                <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl font-serif text-white font-bold mt-2">
                {formatCurrency(totalEarningsGHS)}
              </div>
              <p className="text-[11px] text-[#555] mt-1 font-mono">Lifetime verified commissions</p>
            </div>

            <div className="bg-[#121212] border border-[#242424] rounded-xl p-5 hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#8C8275]">
                <span>Available Balance (Friday Payout)</span>
                <Clock className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl font-serif text-[#D4AF37] font-bold mt-2">
                {formatCurrency(pendingBalanceGHS)}
              </div>
              <p className="text-[11px] text-[#555] mt-1 font-mono">Credited instantly per sale</p>
            </div>

            <div className="bg-[#121212] border border-[#242424] rounded-xl p-5 hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#8C8275]">
                <span>Total Settled Payouts</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-serif text-white font-bold mt-2">
                {formatCurrency(withdrawnBalanceGHS)}
              </div>
              <p className="text-[11px] text-[#555] mt-1 font-mono">Disbursed via Friday Paystack</p>
            </div>

            <div className="bg-[#121212] border border-[#242424] rounded-xl p-5 hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#8C8275]">
                <span>Verified Product Sales</span>
                <Users className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl font-serif text-white font-bold mt-2">
                {totalSalesCount} <span className="text-xs font-normal text-[#8C8275]">Sales</span>
              </div>
              <p className="text-[11px] text-[#555] mt-1 font-mono">Tracked via {userAffiliateCode}</p>
            </div>

          </div>
        </div>
      </section>

      {/* NAVIGATION TABS */}
      <nav className="border-b border-[#1F1F1F] bg-[#0A0A0A] px-4 lg:px-8 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex space-x-1 py-2 min-w-max">
          {[
            { id: 'marketplace', label: 'Marketplace (6 Products)', icon: ShoppingBag },
            { id: 'dashboard', label: 'Sales Ledger', icon: BarChart3 },
            { id: 'vault', label: 'Swipe Vault (TikTok/WA)', icon: Share2 },
            { id: 'calculator', label: 'Profit Calculator', icon: Calculator },
            { id: 'payouts', label: 'Friday Payout Center', icon: DollarSign },
            { id: 'vendor', label: 'Vendor Whitelist Portal', icon: ShieldCheck },
            { id: 'academy', label: 'Affiliate Academy', icon: BookOpen },
            { id: 'leaderboard', label: 'Contests & Leaderboard', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive 
                    ? 'bg-[#D4AF37] text-black font-semibold shadow-md shadow-[#D4AF37]/20' 
                    : 'text-[#8C8275] hover:text-white hover:bg-[#141414]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* MAIN CONTENT WORKSPACE AREA */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        
        {/* TAB 1: PRODUCT MARKETPLACE */}
        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1F1F1F] pb-4">
              <div>
                <h2 className="text-xl font-serif text-white">Verified Digital Marketplace</h2>
                <p className="text-xs text-[#8C8275]">When a customer buys through your link, they receive the product + Pillar 2 Affiliate access, and you earn 50% instantly.</p>
              </div>
              <div className="text-xs text-[#D4AF37] font-mono bg-[#D4AF37]/10 px-3 py-1.5 rounded border border-[#D4AF37]/30">
                All Products &gt; GH₵ 90 • 50% Instant Commission
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PRODUCTS_DATABASE.map((product) => {
                const checkoutAffiliateLink = `${appOrigin}/affiliate?prod=${product.id}&ref=${userAffiliateCode}`;
                const externalOrInternalSalesLink = product.salesPageUrl
                  ? `${product.salesPageUrl}?ref=${userAffiliateCode}&prod=${product.id}`
                  : checkoutAffiliateLink;
                const commissionGHS = (product.priceGHS * product.commissionRate) / 100;
                const isUnlocked = unlockedProducts.includes(product.id);

                return (
                  <div 
                    key={product.id} 
                    className="bg-[#0F0F0F] border border-[#222222] rounded-xl p-6 flex flex-col justify-between hover:border-[#D4AF37]/40 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono uppercase bg-[#1A1A1A] text-[#8C8275] px-2 py-0.5 rounded border border-[#2A2A2A]">
                          {product.category}
                        </span>
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded">
                          Earn 50% ({formatCurrency(commissionGHS)})
                        </span>
                      </div>

                      <h3 className="text-lg font-serif font-bold text-white group-hover:text-[#D4AF37] transition-colors mb-2">
                        {product.title}
                      </h3>

                      <p className="text-xs text-[#8C8275] leading-relaxed mb-6">
                        {product.description}
                      </p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-[#1A1A1A]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#8C8275]">Retail Price (Paid in GH₵):</span>
                        <span className="font-bold text-white font-mono">
                          {formatCurrency(product.priceGHS)} <span className="text-[10px] text-[#8C8275]">(GH₵ {product.priceGHS})</span>
                        </span>
                      </div>

                      {/* AFFILIATE LINK GENERATOR */}
                      <div className="bg-[#141414] border border-[#242424] rounded-lg p-2 flex items-center justify-between space-x-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={checkoutAffiliateLink}
                          className="bg-transparent text-[11px] font-mono text-[#AAA] truncate w-full focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopy(checkoutAffiliateLink, product.id)}
                          className="bg-[#222] hover:bg-[#333] text-white p-1.5 rounded transition-all flex-shrink-0"
                          title="Copy Affiliate Link"
                        >
                          {copiedId === product.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-[#D4AF37]" />}
                        </button>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={() => {
                            if (product.salesPageUrl) {
                              window.open(externalOrInternalSalesLink, '_blank');
                            } else {
                              setPreviewProduct(product);
                            }
                          }}
                          className="bg-[#161616] hover:bg-[#222] text-[#E5E0D8] border border-[#333] text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center space-x-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span>Sales Page</span>
                        </button>

                        {isUnlocked ? (
                          <a
                            href={product.accessUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center space-x-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Open Course</span>
                          </a>
                        ) : (
                          <button
                            onClick={() =>
                              triggerPaystackCheckout({
                                amountGHS: product.priceGHS,
                                productId: product.id,
                                productTitle: product.title,
                                accessUrl: product.accessUrl,
                                commissionGHS
                              })
                            }
                            className="bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:opacity-90 text-black text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center space-x-1 shadow-md shadow-[#D4AF37]/10"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span>Buy (GH₵ {product.priceGHS})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SALES LEDGER & TRANSACTIONS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-[#1F1F1F] pb-4">
              <div>
                <h2 className="text-xl font-serif text-white">Real-Time Transactions Ledger</h2>
                <p className="text-xs text-[#8C8275]">Verified Paystack sales and instant 50% commission allocations tied to {userAffiliateCode}.</p>
              </div>
            </div>

            <div className="bg-[#0F0F0F] border border-[#222222] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#141414] border-b border-[#222222] text-[11px] font-mono text-[#8C8275] uppercase tracking-wider">
                      <th className="py-3 px-4">Paystack Ref</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Customer Email</th>
                      <th className="py-3 px-4">Order Value</th>
                      <th className="py-3 px-4">Your 50% Cut</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A] text-xs font-mono">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[#555]">
                          No verified sales recorded yet. Copy your product link in the Marketplace to start earning 50% commissions!
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[#141414]/50 transition-colors">
                          <td className="py-3.5 px-4 text-[#D4AF37] font-semibold">{tx.reference}</td>
                          <td className="py-3.5 px-4 text-white font-sans">{tx.productTitle}</td>
                          <td className="py-3.5 px-4 text-[#8C8275]">{tx.buyerEmail}</td>
                          <td className="py-3.5 px-4 text-white">{formatCurrency(tx.amountGHS)}</td>
                          <td className="py-3.5 px-4 text-emerald-400 font-bold">{formatCurrency(tx.commissionGHS)}</td>
                          <td className="py-3.5 px-4 text-[#666]">{tx.date}</td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SWIPE VAULT (TIKTOK & WHATSAPP) */}
        {activeTab === 'vault' && (
          <div className="space-y-6">
            <div className="border-b border-[#1F1F1F] pb-4">
              <h2 className="text-xl font-serif text-white">TikTok & WhatsApp High-Converting Swipe Vault</h2>
              <p className="text-xs text-[#8C8275]">Pre-written promotional scripts customized with your affiliate tracking link.</p>
            </div>

            <div className="space-y-8">
              {PRODUCTS_DATABASE.map((product) => {
                const affiliateLink = `${appOrigin}/affiliate?prod=${product.id}&ref=${userAffiliateCode}`;

                return (
                  <div key={product.id} className="bg-[#0F0F0F] border border-[#222222] rounded-xl p-6 space-y-4">
                    <h3 className="text-base font-serif font-bold text-[#D4AF37] flex items-center justify-between">
                      <span>{product.title}</span>
                      <span className="text-xs font-mono text-[#8C8275]">{product.category}</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-[#141414] border border-[#242424] rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-white border-b border-[#222] pb-2">
                          <span className="flex items-center space-x-1.5">
                            <Share2 className="h-4 w-4 text-[#D4AF37]" />
                            <span>TikTok & Reels Caption Hooks</span>
                          </span>
                        </div>
                        {product.swipeCopy.tiktok.map((script, idx) => (
                          <div key={idx} className="bg-[#0A0A0A] p-3 rounded border border-[#1F1F1F]">
                            <p className="text-xs text-[#CCC] leading-relaxed">{script}</p>
                            <button
                              onClick={() => handleCopy(script, `${product.id}-tt-${idx}`)}
                              className="mt-2 text-[10px] text-[#D4AF37] hover:underline flex items-center space-x-1 font-mono"
                            >
                              {copiedId === `${product.id}-tt-${idx}` ? <span>Copied!</span> : <span>Copy Hook</span>}
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="bg-[#141414] border border-[#242424] rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-white border-b border-[#222] pb-2">
                          <span className="flex items-center space-x-1.5">
                            <Send className="h-4 w-4 text-emerald-400" />
                            <span>WhatsApp Broadcast & Status Copy</span>
                          </span>
                        </div>
                        {product.swipeCopy.whatsapp.map((script, idx) => {
                          const formattedScript = script.replace('{LINK}', affiliateLink);
                          return (
                            <div key={idx} className="bg-[#0A0A0A] p-3 rounded border border-[#1F1F1F]">
                              <p className="text-xs text-[#CCC] leading-relaxed whitespace-pre-wrap">{formattedScript}</p>
                              <button
                                onClick={() => handleCopy(formattedScript, `${product.id}-wa-${idx}`)}
                                className="mt-2 text-[10px] text-[#D4AF37] hover:underline flex items-center space-x-1 font-mono"
                              >
                                {copiedId === `${product.id}-wa-${idx}` ? <span>Copied!</span> : <span>Copy Broadcast Text</span>}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: PROFIT CALCULATOR */}
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            <div className="border-b border-[#1F1F1F] pb-4">
              <h2 className="text-xl font-serif text-white">Affiliate Commission Simulator</h2>
              <p className="text-xs text-[#8C8275]">Project your monthly and annual income based on daily sales velocity.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 bg-[#0F0F0F] border border-[#222222] rounded-xl p-6 space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-white mb-2">Select Digital Asset</label>
                  <select 
                    value={calcSelectedProductId}
                    onChange={(e) => setCalcSelectedProductId(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    {PRODUCTS_DATABASE.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} - {formatCurrency(p.priceGHS)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-white">Estimated Daily Sales Volume</label>
                    <span className="font-mono text-sm text-[#D4AF37] font-bold">{calcDailySales} Sales / day</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={calcDailySales}
                    onChange={(e) => setCalcDailySales(parseInt(e.target.value))}
                    className="w-full accent-[#D4AF37] bg-[#222] rounded-lg h-2 cursor-pointer"
                  />
                </div>

                <div className="bg-[#141414] p-4 rounded-lg border border-[#242424] space-y-2 text-xs">
                  <div className="flex justify-between text-[#8C8275]">
                    <span>Product Retail Price:</span>
                    <span className="font-mono text-white">{formatCurrency(calculatedProduct.priceGHS)}</span>
                  </div>
                  <div className="flex justify-between text-[#8C8275]">
                    <span>Commission Split:</span>
                    <span className="font-mono text-emerald-400">50%</span>
                  </div>
                  <div className="flex justify-between text-white font-semibold pt-2 border-t border-[#222]">
                    <span>Your Profit Per Sale:</span>
                    <span className="font-mono text-[#D4AF37]">{formatCurrency(calcCommissionPerSaleGHS)}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-gradient-to-br from-[#0F0F0F] via-[#141414] to-[#0A0A0A] border border-[#D4AF37]/30 rounded-xl p-8 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-[#D4AF37]/10 text-[#D4AF37] px-2.5 py-1 rounded border border-[#D4AF37]/30">
                    Projections Output
                  </span>
                  <h3 className="text-2xl font-serif text-white font-bold mt-4">Estimated Income Stream</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                  <div className="bg-[#080808]/80 border border-[#222] p-4 rounded-lg">
                    <span className="text-[11px] text-[#8C8275]">Daily Profit</span>
                    <div className="text-lg font-serif text-white font-bold mt-1">
                      {formatCurrency(calcDailyRevenueGHS)}
                    </div>
                  </div>

                  <div className="bg-[#080808]/80 border border-[#D4AF37]/40 p-4 rounded-lg">
                    <span className="text-[11px] text-[#D4AF37]">Monthly Profit (30 Days)</span>
                    <div className="text-xl font-serif text-[#D4AF37] font-bold mt-1">
                      {formatCurrency(calcMonthlyRevenueGHS)}
                    </div>
                  </div>

                  <div className="bg-[#080808]/80 border border-[#222] p-4 rounded-lg">
                    <span className="text-[11px] text-[#8C8275]">Annualized Velocity</span>
                    <div className="text-lg font-serif text-white font-bold mt-1">
                      {formatCurrency(calcYearlyRevenueGHS)}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#666] italic">
                  * Commissions credit immediately in GH₵ and disburse every Friday via Mobile Money, Bank Transfer, or USDT.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FRIDAY PAYOUT CENTER */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="border-b border-[#1F1F1F] pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif text-white">Friday Payout Executive Suite</h2>
                <p className="text-xs text-[#8C8275]">Withdrawals unlock every Friday and dispatch to {SUPPORT_EMAIL_PRIMARY} for OTP-verified Paystack Transfer.</p>
              </div>
              <span className={`text-xs font-mono px-3 py-1 rounded border ${
                isFridayGMT
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  : 'bg-[#141414] border-[#262626] text-[#D4AF37]'
              }`}>
                {isFridayGMT ? '● FRIDAY PAYOUT WINDOW OPEN' : '🔒 OPENS EVERY FRIDAY (GMT)'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 bg-[#0F0F0F] border border-[#222222] rounded-xl p-6">
                <form onSubmit={handleRequestPayout} className="space-y-5">
                  {payoutStatusMessage && (
                    <div className={`p-4 rounded-lg text-xs flex items-center space-x-2 ${
                      payoutStatusMessage.type === 'success' 
                        ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' 
                        : 'bg-red-950/60 border border-red-800 text-red-300'
                    }`}>
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{payoutStatusMessage.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-white mb-2">Payout Channel</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setPayoutChannel('MOBILE_MONEY')}
                        className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          payoutChannel === 'MOBILE_MONEY'
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                            : 'bg-[#141414] text-[#8C8275] border-[#262626]'
                        }`}
                      >
                        Mobile Money
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayoutChannel('BANK_TRANSFER')}
                        className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          payoutChannel === 'BANK_TRANSFER'
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                            : 'bg-[#141414] text-[#8C8275] border-[#262626]'
                        }`}
                      >
                        Bank Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayoutChannel('CRYPTO_USDT')}
                        className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          payoutChannel === 'CRYPTO_USDT'
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                            : 'bg-[#141414] text-[#8C8275] border-[#262626]'
                        }`}
                      >
                        USDT (TRC20)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#8C8275] mb-1">Registered Account Holder Full Name</label>
                    <input 
                      type="text"
                      required
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="Exact name registered on MoMo / Bank"
                      className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  {payoutChannel === 'MOBILE_MONEY' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#8C8275] mb-1">Network Provider</label>
                        <select 
                          value={momoNetwork}
                          onChange={(e) => setMomoNetwork(e.target.value)}
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        >
                          <option value="MTN">MTN Mobile Money</option>
                          <option value="TELECEL">Telecel Cash</option>
                          <option value="AT_MONEY">AirtelTigo Money</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[#8C8275] mb-1">Mobile Money Number</label>
                        <input 
                          type="text"
                          required
                          value={momoNumber}
                          onChange={(e) => setMomoNumber(e.target.value)}
                          placeholder="024XXXXXXX"
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                  )}

                  {payoutChannel === 'BANK_TRANSFER' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#8C8275] mb-1">Bank Name</label>
                        <input 
                          type="text"
                          required
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="GCB / Ecobank / Stanbic / Fidelity"
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#8C8275] mb-1">Bank Account Number</label>
                        <input 
                          type="text"
                          required
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          placeholder="14410000XXXXX"
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                  )}

                  {payoutChannel === 'CRYPTO_USDT' && (
                    <div>
                      <label className="block text-xs text-[#8C8275] mb-1">USDT (TRC20) Wallet Address</label>
                      <input 
                        type="text"
                        required
                        value={usdtAddress}
                        onChange={(e) => setUsdtAddress(e.target.value)}
                        placeholder="T..."
                        className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Payout Request Amount (GH₵)</label>
                    <input 
                      type="number"
                      required
                      value={payoutAmountGHS}
                      onChange={(e) => setPayoutAmountGHS(e.target.value)}
                      placeholder="Minimum GH₵ 90.00"
                      className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                    />
                    <p className="text-[11px] text-[#666] mt-1 font-mono">
                      Available Balance: {formatCurrency(pendingBalanceGHS)} (GH₵ {pendingBalanceGHS.toFixed(2)})
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingPayout}
                    className="w-full bg-gradient-to-r from-[#D4AF37] via-[#AA7C11] to-[#D4AF37] hover:opacity-90 text-black font-bold text-xs py-3 rounded-lg transition-all shadow-md uppercase tracking-wider"
                  >
                    {isSubmittingPayout ? 'Submitting to Admin...' : 'Submit Friday Payout Request'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-5 bg-[#0F0F0F] border border-[#222222] rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-serif font-bold text-white flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-[#D4AF37]" />
                  <span>Friday Payout Governance</span>
                </h3>
                <ul className="space-y-3 text-xs text-[#8C8275]">
                  <li>• Payouts are strictly requested and processed on <strong>Fridays (GMT)</strong>.</li>
                  <li>• Minimum withdrawal threshold: <strong>GH₵ 90.00</strong>.</li>
                  <li>• Every request dispatches an instant ticket via Resend to <strong>{SUPPORT_EMAIL_PRIMARY}</strong> and logs in the Admin Command Sector.</li>
                  <li>• Transfers are settled in GH₵ via Paystack with OTP confirmation.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DIGITSTEM-STYLE VENDOR WHITELIST PORTAL */}
        {activeTab === 'vendor' && (
          <div className="space-y-6">
            <div className="border-b border-[#1F1F1F] pb-4">
              <h2 className="text-xl font-serif text-white">Creator / Vendor Whitelist Application</h2>
              <p className="text-xs text-[#8C8275]">
                Vendor access is whitelist-only. Submit your product, sales page, and commission details below or email <strong>{SUPPORT_EMAIL_PRIMARY}</strong>. Approved creators receive a congratulations message and vendor fee link to unlock listing access.
              </p>
            </div>

            <div className="max-w-3xl bg-[#0F0F0F] border border-[#222222] rounded-xl p-6">
              <form onSubmit={handleVendorSubmit} className="space-y-4">
                {vendorStatusMsg && (
                  <div className={`p-4 rounded-lg text-xs flex items-center space-x-2 ${
                    vendorStatusMsg.type === 'success' 
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' 
                      : 'bg-red-950/60 border border-red-800 text-red-300'
                  }`}>
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{vendorStatusMsg.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-white mb-1">Course / Digital Product Title</label>
                  <input 
                    type="text"
                    required
                    value={vendorProductName}
                    onChange={(e) => setVendorProductName(e.target.value)}
                    placeholder="e.g. E-Commerce Importation Blueprint"
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white mb-1">Proposed Price (GH₵) & Affiliate Commission %</label>
                  <input 
                    type="text"
                    required
                    value={vendorPriceGHS}
                    onChange={(e) => setVendorPriceGHS(e.target.value)}
                    placeholder="e.g. GH₵ 240 (50% Affiliate Commission)"
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white mb-1">Product Description & Commission Details</label>
                  <textarea 
                    rows={4}
                    required
                    value={vendorProductDesc}
                    onChange={(e) => setVendorProductDesc(e.target.value)}
                    placeholder="Detail what buyers receive, modules included, and target audience..."
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white mb-1">Sales Page URL & Google Drive Delivery Link</label>
                  <input 
                    type="url"
                    required
                    value={vendorProofUrl}
                    onChange={(e) => setVendorProofUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#D4AF37] hover:bg-[#AA7C11] text-black font-bold text-xs py-3 rounded-lg transition-all shadow-md uppercase tracking-wider"
                >
                  Send Whitelist Application to {SUPPORT_EMAIL_PRIMARY}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 7: AFFILIATE ACADEMY */}
        {activeTab === 'academy' && (
          <div className="space-y-6">
            <div className="border-b border-[#1F1F1F] pb-4">
              <h2 className="text-xl font-serif text-white">HorPal Affiliate Execution Academy</h2>
              <p className="text-xs text-[#8C8275]">Step-by-step training modules on short-form viral traffic, WhatsApp closing, and paid acquisition.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0F0F0F] border border-[#222222] rounded-xl p-5 space-y-3">
                <div className="h-8 w-8 rounded bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold font-mono">01</div>
                <h3 className="text-sm font-serif font-bold text-white">Organic TikTok & Reels Engine</h3>
                <p className="text-xs text-[#8C8275] leading-relaxed">
                  Structure 7-second hooks, high-retention text overlays, and bio link routing that drives 100+ targeted leads daily without paid ads.
                </p>
              </div>

              <div className="bg-[#0F0F0F] border border-[#222222] rounded-xl p-5 space-y-3">
                <div className="h-8 w-8 rounded bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold font-mono">02</div>
                <h3 className="text-sm font-serif font-bold text-white">WhatsApp Conversion Funnel</h3>
                <p className="text-xs text-[#8C8275] leading-relaxed">
                  Master the 3-step WhatsApp status broadcast cycle: Pain Point -&gt; Video Social Proof -&gt; Scarcity Affiliate Link Drop.
                </p>
              </div>

              <div className="bg-[#0F0F0F] border border-[#222222] rounded-xl p-5 space-y-3">
                <div className="h-8 w-8 rounded bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold font-mono">03</div>
                <h3 className="text-sm font-serif font-bold text-white">High-Converting DM Closing</h3>
                <p className="text-xs text-[#8C8275] leading-relaxed">
                  Handle price objections and follow up with warm leads so prospects complete Paystack checkout on the spot.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: CONTESTS & LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="border-b border-[#1F1F1F] pb-4">
              <h2 className="text-xl font-serif text-white">Active Leaderboards & Affiliate Velocity Contests</h2>
              <p className="text-xs text-[#8C8275]">Compete with top affiliates for cash bonuses and tech rewards.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0F0F0F] border border-[#D4AF37]/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase bg-[#D4AF37]/10 text-[#D4AF37] px-2.5 py-1 rounded border border-[#D4AF37]/30">
                    Grand Velocity Challenge
                  </span>
                  <span className="text-xs text-[#8C8275] font-mono">Active</span>
                </div>
                <h3 className="text-lg font-serif font-bold text-white mb-2">HorPal Top Producer Sprint</h3>
                <p className="text-xs text-[#8C8275] mb-4">
                  Hit 100 verified product sales across the HorPal Marketplace to unlock an extra GH₵ 5,000 Friday cash bonus.
                </p>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#8C8275]">Your Verified Sales:</span>
                  <span className="text-[#D4AF37]">{totalSalesCount} / 100 Sales</span>
                </div>
              </div>

              <div className="bg-[#0F0F0F] border border-[#222222] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase bg-[#222] text-[#AAA] px-2.5 py-1 rounded border border-[#333]">
                    Monthly Sprint
                  </span>
                  <span className="text-xs text-[#8C8275] font-mono">Active</span>
                </div>
                <h3 className="text-lg font-serif font-bold text-white mb-2">AI & Trading Super-Affiliate Pool</h3>
                <p className="text-xs text-[#8C8275] mb-4">
                  Top 3 affiliates promoting The AI Faceless Video Engine, MMM, and Day Trading Roadmap share the monthly bonus pool.
                </p>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#8C8275]">Your Progress:</span>
                  <span className="text-[#D4AF37]">{totalSalesCount} / 50 Sales</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* BUILT-IN SALES PAGE MODAL FOR PRODUCTS WITHOUT AN EXTERNAL VERCEL LINK */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F0F0F] border border-[#D4AF37]/40 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase bg-[#D4AF37]/10 text-[#D4AF37] px-2.5 py-1 rounded border border-[#D4AF37]/30">
                {previewProduct.category}
              </span>
              <button
                onClick={() => setPreviewProduct(null)}
                className="text-xs text-[#8C8275] hover:text-white"
              >
                Close ✕
              </button>
            </div>
            <h3 className="text-xl font-serif font-bold text-white">{previewProduct.title}</h3>
            <p className="text-xs text-[#CCC] leading-relaxed">{previewProduct.description}</p>
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex justify-between items-center text-xs">
              <span>Price (Includes Pillar 2 Affiliate Access):</span>
              <span className="font-mono font-bold text-[#D4AF37] text-sm">
                GH₵ {previewProduct.priceGHS.toFixed(2)} (${previewProduct.priceUSD})
              </span>
            </div>
            <button
              onClick={() => {
                const prod = previewProduct;
                setPreviewProduct(null);
                triggerPaystackCheckout({
                  amountGHS: prod.priceGHS,
                  productId: prod.id,
                  productTitle: prod.title,
                  accessUrl: prod.accessUrl,
                  commissionGHS: (prod.priceGHS * prod.commissionRate) / 100
                });
              }}
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-bold text-xs py-3 rounded-xl uppercase tracking-wider"
            >
              Buy Now via Paystack — Instant Access
            </button>
          </div>
        </div>
      )}

      {/* FOOTER & SUPPORT CONCIERGE INFORMATION */}
      <footer className="border-t border-[#1F1F1F] bg-[#0A0A0A] py-8 px-4 lg:px-8 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif text-sm font-bold text-white">HORPAL LUXURY PLATFORM</span>
              <span className="text-[10px] text-[#8C8275]">| Governance & Payouts Engine</span>
            </div>
            <p className="text-xs text-[#555] mt-1">© {new Date().getFullYear()} HorPal Platform. All rights reserved.</p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#8C8275]">
            <div>
              <span className="text-[#555] block text-[10px] uppercase font-mono">Primary Concierge Email:</span>
              <a href={`mailto:${SUPPORT_EMAIL_PRIMARY}`} className="text-[#D4AF37] hover:underline font-mono">{SUPPORT_EMAIL_PRIMARY}</a>
            </div>

            <div>
              <span className="text-[#555] block text-[10px] uppercase font-mono">Secondary Support:</span>
              <a href={`mailto:${SUPPORT_EMAIL_SECONDARY}`} className="text-[#D4AF37] hover:underline font-mono">{SUPPORT_EMAIL_SECONDARY}</a>
            </div>

            <div>
              <span className="text-[#555] block text-[10px] uppercase font-mono">WhatsApp Desk:</span>
              <a href={`https://wa.me/233${SUPPORT_WHATSAPP.substring(1)}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline font-mono">+{SUPPORT_WHATSAPP}</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
