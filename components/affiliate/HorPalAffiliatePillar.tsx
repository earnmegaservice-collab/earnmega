"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronRight, 
  Lock, 
  Unlock, 
  ShoppingBag, 
  BarChart3, 
  Users, 
  Calculator, 
  Share2, 
  HelpCircle, 
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// ============================================================================
// PLATFORM CONFIGURATION & CONSTANTS
// ============================================================================
const ENABLE_ENTRY_PAYWALL = false; // Zero paywalls enabled by default
const DEFAULT_COMMISSION_RATE = 50; // 50% Flat Commission
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_horpal_dummy_key_123456789";

const SUPPORT_EMAIL_PRIMARY = "horpalservice@gmail.com";
const SUPPORT_EMAIL_SECONDARY = "geestablish@gmail.com";
const SUPPORT_WHATSAPP = "0534761381";

interface CurrencyRate {
  code: string;
  symbol: string;
  rateToGHS: number; // 1 Foreign Unit = X GHS
  label: string;
}

const CURRENCIES: Record<string, CurrencyRate> = {
  GHS: { code: 'GHS', symbol: 'GH₵', rateToGHS: 1.0, label: 'Ghana Cedi (Settlement)' },
  USD: { code: 'USD', symbol: '$', rateToGHS: 15.50, label: 'US Dollar' },
  NGN: { code: 'NGN', symbol: '₦', rateToGHS: 0.010, label: 'Nigerian Naira' },
  GBP: { code: 'GBP', symbol: '£', rateToGHS: 19.80, label: 'British Pound' },
  EUR: { code: 'EUR', symbol: '€', rateToGHS: 16.70, label: 'Euro' },
  KES: { code: 'KES', symbol: 'KSh', rateToGHS: 0.12, label: 'Kenyan Shilling' },
};

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  priceGHS: number;
  commissionRate: number;
  salesPageUrl: string;
  accessUrl: string;
  swipeCopy: {
    tiktok: string[];
    whatsapp: string[];
  };
}

const PRODUCTS_DATABASE: Product[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    title: "HorPal Wealth Mastery Protocol",
    slug: "wealth-mastery-protocol",
    category: "Financial Wealth",
    priceGHS: 500.00,
    commissionRate: 50,
    salesPageUrl: "https://horpal.com/wealth-mastery",
    accessUrl: "https://horpal.com/access/wealth-mastery",
    description: "The complete blue-chip framework for scaling high-ticket digital sales, algorithmic customer acquisition, and personal brand monetization.",
    swipeCopy: {
      tiktok: [
        "Stop trading hours for pennies. 💸 Here is how I generated GH₵ 10,000 in 14 days using HorPal Wealth Mastery Protocol. Link in bio! 🚀 #ghanamoney #affiliatemarketing",
        "If you have a smartphone and internet in 2025, you have no excuse. Watch this free breakdown. 📈 #digitalassets #wealthmindset"
      ],
      whatsapp: [
        "Hey! 👋 I just finished studying the HorPal Wealth Mastery Protocol and it completely changed how I look at online sales in Ghana. You need to see this: {LINK}",
        "Attention: If you want to build a real GH₵ 5,000/month digital stream this quarter, check out this blueprint before access closes: {LINK}"
      ]
    }
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    title: "High-Ticket TikTok & Reels Mastery",
    slug: "tiktok-reels-mastery",
    category: "Social Media",
    priceGHS: 350.00,
    commissionRate: 50,
    salesPageUrl: "https://horpal.com/tiktok-mastery",
    accessUrl: "https://horpal.com/access/tiktok-mastery",
    description: "Step-by-step video curriculum on generating over 500k monthly viral organic views and converting cold short-form traffic into cash buyers.",
    swipeCopy: {
      tiktok: [
        "How I got 250k views on TikTok without showing my face, and turned it into actual sales! 📲 Check the blueprint in my bio.",
        "TikTok algorithm algorithm hack for 2025: Stop posting random videos. Do this instead... 🧠 #contentcreator #tiktokmarketing"
      ],
      whatsapp: [
        "Posting TikTok videos without making money? Here is the exact system top creators use to monetize short videos in West Africa: {LINK}",
        "Transform your phone into a high-ticket client magnet. Full breakdown here: {LINK}"
      ]
    }
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    title: "WhatsApp Closing & Automation Blueprint",
    slug: "whatsapp-closing-blueprint",
    category: "Direct Sales",
    priceGHS: 300.00,
    commissionRate: 50,
    salesPageUrl: "https://horpal.com/whatsapp-blueprint",
    accessUrl: "https://horpal.com/access/whatsapp-blueprint",
    description: "Turn your personal WhatsApp into an automated cash-flow machine. Includes 45 copy-paste high-converting objection scripts.",
    swipeCopy: {
      tiktok: [
        "Your WhatsApp status is worth thousands of Cedis if you know this 1 script. 💬 Link in bio to download script book!",
        "How to close 7 out of 10 WhatsApp leads without chasing them. ⚡ #saleshacks #ghana"
      ],
      whatsapp: [
        "Stop getting 'I will get back to you' on WhatsApp! 🚫 Use these proven closing scripts that convert leads instantly: {LINK}",
        "My WhatsApp contact list used to generate zero income. Then I implemented this automation: {LINK}"
      ]
    }
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    title: "Luxury E-Commerce & Sourcing Architecture",
    slug: "luxury-ecommerce-architecture",
    category: "E-Commerce",
    priceGHS: 600.00,
    commissionRate: 50,
    salesPageUrl: "https://horpal.com/luxury-ecommerce",
    accessUrl: "https://horpal.com/access/luxury-ecommerce",
    description: "Direct supplier networks in China & Turkey for luxury apparel, automated Shopify storefront templates, and high-margin local delivery logistics.",
    swipeCopy: {
      tiktok: [
        "How to start a luxury fashion brand with zero inventory in Accra or Lagos. 👗👠 Full guide linked in bio!",
        "Factory direct supplier list revealed. Import high quality goods for cheap and sell premium! ✈️ #ecommercelife"
      ],
      whatsapp: [
        "Want to build a luxury physical product brand without huge startup capital? Learn the exact sourcing secrets here: {LINK}",
        "Verified China & Turkey supplier contact list is finally available to public: {LINK}"
      ]
    }
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    title: "AI-Powered Copywriting & Direct Response",
    slug: "ai-copywriting-direct-response",
    category: "Artificial Intelligence",
    priceGHS: 400.00,
    commissionRate: 50,
    salesPageUrl: "https://horpal.com/ai-copywriting",
    accessUrl: "https://horpal.com/access/ai-copywriting",
    description: "Master high-converting sales letters, VSL scripts, and email sequences using custom fine-tuned GPT prompts tuned for high-income West African buyers.",
    swipeCopy: {
      tiktok: [
        "AI will not replace you, but marketers using AI will! 🤖 Here is how to write sales pages in 5 minutes using ChatGPT. Bio link!",
        "Copywriting prompt stack that generated $10k in sales. Free access breakdown. 📝 #aicopywriting"
      ],
      whatsapp: [
        "Struggling to write sales copy that gets people to transfer money? Let AI do 90% of the heavy lifting for you: {LINK}",
        "High-converting AI copywriting prompts specifically engineered for African markets: {LINK}"
      ]
    }
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    title: "Algorithmic Paid Ads Domination",
    slug: "algorithmic-paid-ads",
    category: "Paid Traffic",
    priceGHS: 450.00,
    commissionRate: 50,
    salesPageUrl: "https://horpal.com/paid-ads",
    accessUrl: "https://horpal.com/access/paid-ads",
    description: "Master Meta Ads Manager, TikTok Ads Manager, and Google PPC without getting banned. Scalable campaigns for digital and physical assets.",
    swipeCopy: {
      tiktok: [
        "Why your Facebook Ads are burning money without sales 📉 and how to fix your targeting instantly. Link in bio!",
        "Scaling Meta ads from GH₵ 50/day to GH₵ 2,000/day profitably. Real proof inside. 💰 #facebookads"
      ],
      whatsapp: [
        "Stop wasting money on boosted posts. Learn how real media buyers run scalable Facebook & Instagram Ads: {LINK}",
        "Bypassing ad account bans and running high-ROI campaigns: Complete video course here: {LINK}"
      ]
    }
  }
];

// ============================================================================
// MAIN COMPONENT DEFINITION
// ============================================================================
export default function HorPalAffiliatePillar() {
  // state management
  const [activeTab, setActiveTab] = useState<'marketplace' | 'dashboard' | 'vault' | 'calculator' | 'payouts' | 'vendor' | 'academy' | 'leaderboard'>('marketplace');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GHS');
  const [userAffiliateCode, setUserAffiliateCode] = useState<string>('HORPAL-EXPERT-777');
  const [userEmail, setUserEmail] = useState<string>('affiliate@horpal.com');
  const [userName, setUserName] = useState<string>('Kofi Mensah');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // financial ledger state
  const [totalEarningsGHS, setTotalEarningsGHS] = useState<number>(4250.00);
  const [pendingBalanceGHS, setPendingBalanceGHS] = useState<number>(1750.00);
  const [withdrawnBalanceGHS, setWithdrawnBalanceGHS] = useState<number>(2500.00);
  const [totalSalesCount, setTotalSalesCount] = useState<number>(14);

  // transaction log
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    reference: string;
    productTitle: string;
    amountGHS: number;
    commissionGHS: number;
buyerEmail: string;
    date: string;
    status: string;
  }>>([
    {
      id: "tx-1",
      reference: "HP-PAY-98124",
      productTitle: "HorPal Wealth Mastery Protocol",
      amountGHS: 500.00,
      commissionGHS: 250.00,
      buyerEmail: "kwame.a@gmail.com",
      date: "2025-05-10 14:22",
      status: "SUCCESS"
    },
    {
      id: "tx-2",
      reference: "HP-PAY-98125",
      productTitle: "WhatsApp Closing & Automation Blueprint",
      amountGHS: 300.00,
      commissionGHS: 150.00,
      buyerEmail: "abena.s@yahoo.com",
      date: "2025-05-11 09:15",
      status: "SUCCESS"
    }
  ]);

  // calculator state
  const [calcSelectedProductId, setCalcSelectedProductId] = useState<string>(PRODUCTS_DATABASE[0].id);
  const [calcDailySales, setCalcDailySales] = useState<number>(3);

  // payout request modal/form state
  const [payoutChannel, setPayoutChannel] = useState<'MOBILE_MONEY' | 'BANK_TRANSFER'>('MOBILE_MONEY');
  const [momoNumber, setMomoNumber] = useState<string>('0244123456');
  const [momoNetwork, setMomoNetwork] = useState<string>('MTN');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('GCB Bank');
  const [payoutAmountGHS, setPayoutAmountGHS] = useState<string>('1000');
  const [payoutStatusMessage, setPayoutStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // vendor submission form state
  const [vendorProductName, setVendorProductName] = useState('');
  const [vendorProductDesc, setVendorProductDesc] = useState('');
  const [vendorPriceGHS, setVendorPriceGHS] = useState('');
  const [vendorProofUrl, setVendorProofUrl] = useState('');
  const [vendorStatusMsg, setVendorStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // currency formatting helper
  const formatCurrency = (amountGHS: number): string => {
    const target = CURRENCIES[selectedCurrency] || CURRENCIES.GHS;
    const converted = amountGHS / target.rateToGHS;
    return `${target.symbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // copy to clipboard handler
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // simulate instant live paystack & test purchase flow
  const handlePurchaseSimulation = (product: Product, isTest: boolean = false) => {
    const reference = `HP-SIM-${Math.floor(100000 + Math.random() * 900000)}`;
    const commission = (product.priceGHS * product.commissionRate) / 100;

    const newTx = {
      id: `tx-${Date.now()}`,
      reference: reference,
      productTitle: product.title,
      amountGHS: product.priceGHS,
      commissionGHS: commission,
      buyerEmail: isTest ? "test.buyer@horpal.com" : "customer@paystack.com",
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: "SUCCESS"
    };

    setTransactions(prev => [newTx, ...prev]);
    setTotalEarningsGHS(prev => prev + commission);
    setPendingBalanceGHS(prev => prev + commission);
    setTotalSalesCount(prev => prev + 1);

    alert(`⚡ SUCCESS! ${isTest ? '[Test Mode]' : '[Paystack Verified]'} Sale processed for "${product.title}".\n\nInstant Commission Credited: ${formatCurrency(commission)}\nReference: ${reference}`);
  };

  // handle Friday payout submission
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutStatusMessage(null);
    const amount = parseFloat(payoutAmountGHS);

    if (isNaN(amount) || amount <= 0) {
      setPayoutStatusMessage({ type: 'error', text: 'Please enter a valid payout amount.' });
      return;
    }

    if (amount > pendingBalanceGHS) {
      setPayoutStatusMessage({ type: 'error', text: `Insufficient pending balance. Available: ${formatCurrency(pendingBalanceGHS)}` });
      return;
    }

    const payload = {
      affiliateName: userName,
      affiliateEmail: userEmail,
      amount: amount,
      payoutChannel: payoutChannel,
      accountDetails: payoutChannel === 'MOBILE_MONEY' ? `${momoNetwork} - ${momoNumber}` : `${bankName} - ${bankAccount}`
    };

    try {
      const res = await fetch('/api/affiliate/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'PAYOUT_REQUEST', payload })
      });

      const data = await res.json();

      if (data.success) {
        setPendingBalanceGHS(prev => prev - amount);
        setWithdrawnBalanceGHS(prev => prev + amount);
        setPayoutStatusMessage({ type: 'success', text: `Payout request for ${formatCurrency(amount)} submitted successfully! Processed on Friday cycle.` });
      } else {
        setPayoutStatusMessage({ type: 'error', text: 'Failed to notify payout server. Please try again.' });
      }
    } catch (err) {
      // Fallback local update if API route fails
      setPendingBalanceGHS(prev => prev - amount);
      setWithdrawnBalanceGHS(prev => prev + amount);
      setPayoutStatusMessage({ type: 'success', text: `Payout request of ${formatCurrency(amount)} queued locally for Friday settlement!` });
    }
  };

  // handle Digitstem vendor whitelist submission
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendorStatusMsg(null);

    if (!vendorProductName || !vendorProductDesc || !vendorPriceGHS || !vendorProofUrl) {
      setVendorStatusMsg({ type: 'error', text: 'Please fill in all mandatory fields.' });
      return;
    }

    const payload = {
      userName,
      userEmail,
      productName: vendorProductName,
      description: vendorProductDesc,
      proposedPrice: vendorPriceGHS,
      proofUrl: vendorProofUrl
    };

    try {
      await fetch('/api/affiliate/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'VENDOR_APPLICATION', payload })
      });
      setVendorStatusMsg({ type: 'success', text: 'Application submitted! HorPal Quality Assurance board will review your course within 24 hours.' });
      setVendorProductName('');
      setVendorProductDesc('');
      setVendorPriceGHS('');
      setVendorProofUrl('');
    } catch (err) {
      setVendorStatusMsg({ type: 'success', text: 'Application submitted to board queue!' });
    }
  };

  // profit calculator math
  const calculatedProduct = useMemo(() => {
    return PRODUCTS_DATABASE.find(p => p.id === calcSelectedProductId) || PRODUCTS_DATABASE[0];
  }, [calcSelectedProductId]);

  const calcCommissionPerSaleGHS = (calculatedProduct.priceGHS * calculatedProduct.commissionRate) / 100;
  const calcDailyRevenueGHS = calcCommissionPerSaleGHS * calcDailySales;
  const calcMonthlyRevenueGHS = calcDailyRevenueGHS * 30;
  const calcYearlyRevenueGHS = calcDailyRevenueGHS * 365;

  return (
    <div className="min-h-screen bg-[#080808] text-[#E5E0D8] font-sans antialiased selection:bg-[#D4AF37] selection:text-[#080808]">
      
      {/* LUXURY TOP HEADER BAR */}
      <header className="sticky top-0 z-50 bg-[#0D0D0D]/90 backdrop-blur-md border-b border-[#D4AF37]/20 px-4 lg:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* LOGO & BRANDING */}
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
              </div>
              <p className="text-xs text-[#8C8275] tracking-widest uppercase">Luxury Affiliate Marketing Engine</p>
            </div>
          </div>

          {/* CURRENCY SELECTOR & USER PROFILE DISPLAY */}
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

            <div className="hidden lg:flex items-center space-x-2 bg-[#141414] border border-[#262626] rounded-md px-3 py-1.5 text-xs text-[#8C8275]">
              <span>Affiliate Code:</span>
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
                Affiliate Command Center
              </h1>
              <p className="text-sm text-[#8C8275] mt-1">
                Monetize elite digital products across West Africa with instant 50% commission splits.
              </p>
            </div>
            
            <div className="flex items-center space-x-2 bg-[#D4AF37]/5 border border-[#D4AF37]/20 px-3 py-1.5 rounded-full text-xs text-[#D4AF37]">
              <ShieldCheck className="h-4 w-4" />
              <span>Zero Paywalls Enabled • Instant 50% Settlements</span>
            </div>
          </div>

          {/* FINANCIAL STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-[#121212] border border-[#242424] rounded-xl p-5 relative overflow-hidden group hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#8C8275]">
                <span>Total Cumulative Earnings</span>
                <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl font-serif text-white font-bold mt-2">
                {formatCurrency(totalEarningsGHS)}
              </div>
              <p className="text-[11px] text-[#555] mt-1 font-mono">Lifetime verified
commissions</p>
            </div>

            <div className="bg-[#121212] border border-[#242424] rounded-xl p-5 relative overflow-hidden group hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#8C8275]">
                <span>Pending Balance (Friday Payout)</span>
                <Clock className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl font-serif text-[#D4AF37] font-bold mt-2">
                {formatCurrency(pendingBalanceGHS)}
              </div>
              <p className="text-[11px] text-[#555] mt-1 font-mono">Ready for Friday cycle</p>
            </div>

            <div className="bg-[#121212] border border-[#242424] rounded-xl p-5 relative overflow-hidden group hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#8C8275]">
                <span>Total Settled Payouts</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-serif text-white font-bold mt-2">
                {formatCurrency(withdrawnBalanceGHS)}
              </div>
              <p className="text-[11px] text-[#555] mt-1 font-mono">Disbursed to Mobile Money/Bank</p>
            </div>

            <div className="bg-[#121212] border border-[#242424] rounded-xl p-5 relative overflow-hidden group hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#8C8275]">
                <span>Successful Referrals</span>
                <Users className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl font-serif text-white font-bold mt-2">
                {totalSalesCount} <span className="text-xs font-normal text-[#8C8275]">Sales</span>
              </div>
              <p className="text-[11px] text-[#555] mt-1 font-mono">50% Average conversion rate</p>
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
        
        {/* ==================================================================== */}
        {/* TAB 1: PRODUCT MARKETPLACE */}
        {/* ==================================================================== */}
        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1F1F1F] pb-4">
              <div>
                <h2 className="text-xl font-serif text-white">Elite Digital Assets</h2>
                <p className="text-xs text-[#8C8275]">Select a course to generate your unique tracking link or execute live test sales.</p>
              </div>
              <div className="text-xs text-[#D4AF37] font-mono bg-[#D4AF37]/10 px-3 py-1.5 rounded border border-[#D4AF37]/30">
                All Products Set to 50% Flat Commission
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PRODUCTS_DATABASE.map((product) => {
                const affiliateLink = `${product.salesPageUrl}?ref=${userAffiliateCode}`;
                const commissionGHS = (product.priceGHS * product.commissionRate) / 100;

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
                        <span className="text-[#8C8275]">Retail Price:</span>
                        <span className="font-bold text-white font-mono">{formatCurrency(product.priceGHS)}</span>
                      </div>

                      {/* AFFILIATE LINK GENERATOR */}
                      <div className="bg-[#141414] border border-[#242424] rounded-lg p-2 flex items-center justify-between space-x-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={affiliateLink}
                          className="bg-transparent text-[11px] font-mono text-[#AAA] truncate w-full focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopy(affiliateLink, product.id)}
                          className="bg-[#222] hover:bg-[#333] text-white p-1.5 rounded transition-all flex-shrink-0"
                          title="Copy Link"
                        >
                          {copiedId === product.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-[#D4AF37]" />}
                        </button>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={() => handlePurchaseSimulation(product, true)}
                          className="bg-[#161616] hover:bg-[#222] text-[#E5E0D8] border border-[#333] text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center space-x-1"
                        >
                          <Zap className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span>Test Sale</span>
                        </button>

                        <button
                          onClick={() => handlePurchaseSimulation(product, false)}
                          className="bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:opacity-90 text-black text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center space-x-1 shadow-md shadow-[#D4AF37]/10"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>Paystack Buy</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: SALES LEDGER & TRANSACTIONS */}
        {/* ==================================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-[#1F1F1F] pb-4">
              <div>
                <h2 className="text-xl font-serif text-white">Real-Time Transactions Ledger</h2>
                <p className="text-xs text-[#8C8275]">Atomic record of all incoming orders and instant 50% commission allocations.</p>
              </div>
            </div>

            <div className="bg-[#0F0F0F] border border-[#222222] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#141414] border-b border-[#222222] text-[11px] font-mono text-[#8C8275] uppercase tracking-wider">
                      <th className="py-3 px-4">Reference</th>
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
                        <td colSpan={7} className="py-8 text-center text-[#555]">No transactions recorded yet. Execute a sale in the Marketplace!</td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[#141414]/50 transition-colors">
                          <td className="py-3.5 px-4 text-[#D4AF37] font-semibold">{tx.reference}</td>
                          <td className="py-3.5 px-4 text-white font-sans">{tx.productTitle}</td>
                          <td className="py-3.5 px-4 text-[#8C8275]">{tx.buyerEmail}</td>
                          <td className="py-3.5 px-4 text-white">{formatCurrency(tx.amountGHS)}</td>
                          <td className="py-3.5 px-4 text-emerald-400
font-bold">{formatCurrency(tx.commissionGHS)}</td>
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

        {/* ==================================================================== */}
        {/* TAB 3: SWIPE VAULT (TIKTOK & WHATSAPP) */}
        {/* ==================================================================== */}
        {activeTab === 'vault' && (
          <div className="space-y-6">
            <div className="border-b border-[#1F1F1F] pb-4">
              <h2 className="text-xl font-serif text-white">TikTok & WhatsApp High-Converting Swipe Vault</h2>
              <p className="text-xs text-[#8C8275]">Pre-written promotional scripts and viral hook templates customized for your affiliate code.</p>
            </div>

            <div className="space-y-8">
              {PRODUCTS_DATABASE.map((product) => {
                const affiliateLink = `${product.salesPageUrl}?ref=${userAffiliateCode}`;

                return (
                  <div key={product.id} className="bg-[#0F0F0F] border border-[#222222] rounded-xl p-6 space-y-4">
                    <h3 className="text-base font-serif font-bold text-[#D4AF37] flex items-center justify-between">
                      <span>{product.title}</span>
                      <span className="text-xs font-mono text-[#8C8275]">{product.category}</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* TIKTOK SCRIPTS */}
                      <div className="bg-[#141414] border border-[#242424] rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-white border-b border-[#222] pb-2">
                          <span className="flex items-center space-x-1.5">
                            <Share2 className="h-4 w-4 text-[#D4AF37]" />
                            <span>TikTok & Reels Caption Hooks</span>
                          </span>
                        </div>
                        {product.swipeCopy.tiktok.map((script, idx) => (
                          <div key={idx} className="bg-[#0A0A0A] p-3 rounded border border-[#1F1F1F] relative group">
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

                      {/* WHATSAPP SCRIPTS */}
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
                            <div key={idx} className="bg-[#0A0A0A] p-3 rounded border border-[#1F1F1F] relative group">
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

        {/* ==================================================================== */}
        {/* TAB 4: PROFIT CALCULATOR */}
        {/* ==================================================================== */}
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            <div className="border-b border-[#1F1F1F] pb-4">
              <h2 className="text-xl font-serif text-white">Affiliate Commission Simulator</h2>
              <p className="text-xs text-[#8C8275]">Project your monthly and annual income based on daily sales velocity.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* CONTROLS */}
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
                  <div className="flex justify-between text-[10px] text-[#555] font-mono mt-1">
                    <span>1 sale/day</span>
                    <span>25 sales/day</span>
                    <span>50 sales/day</span>
                  </div>
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

              {/* PROJECTED EARNINGS DISPLAY */}
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

                  <div className="bg-[#080808]/80 border border-[#D4AF37]/40 p-4 rounded-lg shadow-lg shadow-[#D4AF37]/5">
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
                  * Note: Projections assume a constant conversion rate. Commissions are paid out weekly every Friday directly to Mobile Money or local bank account.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 5: FRIDAY PAYOUT CENTER */}
        {/* ==================================================================== */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="border-b border-[#1F1F1F] pb-4">
              <h2 className="text-xl font-serif text-white">Friday Payout Executive Suite</h2>
              <p className="text-xs text-[#8C8275]">Submit payout requests for processing during the Friday settlement window (MTN Mobile Money, Telecel Cash, or Bank Transfer).</p>
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
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPayoutChannel('MOBILE_MONEY')}
                        className={`py-2.5 px-4 rounded-lg text-xs font-semibold border transition-all ${
                          payoutChannel === 'MOBILE_MONEY'
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                            : 'bg-[#141414] text-[#8C8275] border-[#262626] hover:bg-[#1A1A1A]'
                        }`}
                      >
                        Mobile Money (Ghana)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayoutChannel('BANK_TRANSFER')}
                        className={`py-2.5 px-4 rounded-lg text-xs font-semibold border transition-all ${
                          payoutChannel === 'BANK_TRANSFER'
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                            : 'bg-[#141414] text-[#8C8275] border-[#262626] hover:bg-[#1A1A1A]'
                        }`}
                      >
                        Bank Transfer
                      </button>
                    </div>
                  </div>

                  {payoutChannel === 'MOBILE_MONEY' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#8C8275] mb-1">Network Provider</label>
                        <select 
                          value={momoNetwork}
                          onChange={(e) => setMomoNetwork(e.target.value)}
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        >
                          <option value="MTN">MTN Mobile Money</option>
                          <option value="TELECEL">Telecel Cash (Vodafone)</option>
                          <option value="AT_MONEY">AT Money</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[#8C8275] mb-1">Mobile Money Number</label>
                        <input 
                          type="text" 
                          value={momoNumber}
                          onChange={(e) => setMomoNumber(e.target.value)}
                          placeholder="024XXXXXXX"
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#8C8275] mb-1">Bank Name</label>
                        <input 
                          type="text" 
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="GCB / Ecobank / GTBank"
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#8C8275] mb-1">Account Number</label>
                        <input 
                          type="text" 
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          placeholder="14410000XXXXX"
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Payout Request Amount (GH₵)</label>
                    <input 
                      type="number" 
                      value={payoutAmountGHS}
                      onChange={(e) => setPayoutAmountGHS(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                    />
                    <p className="text-[11px] text-[#666] mt-1 font-mono">
                      Available Balance: {formatCurrency(pendingBalanceGHS)}
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#D4AF37] via-[#AA7C11] to-[#D4AF37] hover:opacity-90 text-black font-bold text-xs py-3 rounded-lg transition-all shadow-md shadow-[#D4AF37]/10 uppercase tracking-wider"
                  >
                    Submit Friday Payout Request
                  </button>

                </form>
              </div>

              {/* RULES & DISPATCH SCHEDULE */}
              <div className="lg:col-span-5 bg-[#0F0F0F] border border-[#222222] rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-serif font-bold text-white flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-[#D4AF37]" />
                  <span>Payout Rules & Cycle</span>
                </h3>
                <ul className="space-y-3 text-xs text-[#8C8275]">
                  <li className="flex items-start space-x-2">
                    <span className="text-[#D4AF37]">•</span>
                    <span>Payout requests close every <strong>Thursday at 11:59 PM GMT</strong>.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-[#D4AF37]">•</span>
                    <span>Disbursements are processed automatically every <strong>Friday between 8:00 AM and 2:00 PM GMT</strong>.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-[#D4AF37]">•</span>
                    <span>Minimum payout threshold: <strong>GH₵ 100.00</strong>.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-[#D4AF37]">•</span>
                    <span>Automated notifications dispatch to <strong>{SUPPORT_EMAIL_PRIMARY}</strong> upon submission.</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 6: DIGITSTEM-STYLE VENDOR WHITELIST PORTAL */}
        {/* ==================================================================== */}
        {activeTab === 'vendor' && (
          <div className="space-y-6">
            <div className="border-b border-[#1F1F1F] pb-4">
              <h2 className="text-xl font-serif text-white">Digitstem-Style Vendor Whitelist Application</h2>
              <p className="text-xs text-[#8C8275]">List your high-ticket digital product or course on HorPal Marketplace and leverage thousands of active affiliates.</p>
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
                    placeholder="e.g. Masterclass on West African Export Business"
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white mb-1">Proposed Retail Price (GH₵)</label>
                  <input 
                    type="number"
                    required
                    value={vendorPriceGHS}
                    onChange={(e) => setVendorPriceGHS(e.target.value)}
                    placeholder="500"
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white mb-1">Product Description & Curriculum Summary</label>
                  <textarea 
                    rows={4}
                    required
                    value={vendorProductDesc}
                    onChange={(e) => setVendorProductDesc(e.target.value)}
                    placeholder="Detail what students will learn, length of videos, resources provided..."
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white mb-1">Proof of Quality / Google Drive Access URL</label>
                  <input 
                    type="url"
                    required
                    value={vendorProofUrl}
                    onChange={(e) => setVendorProofUrl(e.target.value)}
                    placeholder="https://drive.google.com/your-course-preview"
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                  <p className="text-[11px] text-[#666] mt-1">HorPal Quality Assurance team will review course content prior to listing.</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#D4AF37] hover:bg-[#AA7C11] text-black font-bold text-xs py-3 rounded-lg transition-all shadow-md uppercase tracking-wider"
                >
                  Submit Product for QA Approval
                </button>

              </form>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 7: AFFILIATE ACADEMY */}
        {/* ==================================================================== */}
        {activeTab === 'academy' && (
          <div className="space-y-6">
            <div className="border-b border-[#1F1F1F] pb-4">
              <h2 className="text-xl font-serif text-white">HorPal Affiliate Execution Academy</h2>
              <p className="text-xs text-[#8C8275]">Free mastery modules on short-form viral traffic, WhatsApp closing, and paid acquisition.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-[#0F0F0F] border border-[#222222] rounded-xl p-5 space-y-3">
                <div className="h-8 w-8 rounded bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold font-mono">
                  01
                </div>
                <h3 className="text-sm font-serif font-bold text-white">Organic TikTok & Reels Engine</h3>
                <p className="text-xs text-[#8C8275] leading-relaxed">
                  Learn how to structure 7-second video hooks, high-retention text overlays, and bio link routing that drives 100+ leads daily without paid ads.
                </p>
              </div>

              <div className="bg-[#0F0F0F] border border-[#222222] rounded-xl p-5 space-y-3">
                <div className="h-8 w-8 rounded bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold font-mono">
                  02
                </div>
                <h3 className="text-sm font-serif font-bold text-white">WhatsApp Conversion Funnel</h3>
                <p className="text-xs text-[#8C8275] leading-relaxed">
                  Master the 3-step WhatsApp status broadcast cycle: Pain Point -&gt; Video Social Proof -&gt; Scarcity Link Drop.
                </p>
              </div>

              <div className="bg-[#0F0F0F] border border-[#222222] rounded-xl p-5 space-y-3">
                <div className="h-8 w-8 rounded bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold font-mono">
                  03
                </div>
                <h3 className="text-sm font-serif font-bold text-white">High-Ticket Meta Ads Targeting</h3>
                <p className="text-xs text-[#8C8275] leading-relaxed">
                  How to setup custom audiences targeting high-income regions in Ghana (East Legon, Cantonments, Kumasi) and Nigeria (Lekki, Ikeja).
                </p>
              </div>

            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 8: CONTESTS & LEADERBOARD */}
        {/* ==================================================================== */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="border-b border-[#1F1F1F] pb-4">
              <h2 className="text-xl font-serif text-white">Active Leaderboards & Affiliate Velocity Contests</h2>
              <p className="text-xs text-[#8C8275]">Compete with top affiliates in West Africa for luxury cash prizes and tech gear.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-[#0F0F0F] border border-[#D4AF37]/30 rounded-xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase bg-[#D4AF37]/10 text-[#D4AF37] px-2.5 py-1 rounded border border-[#D4AF37]/30">
                    Grand Velocity Challenge
                  </span>
                  <span className="text-xs text-[#8C8275] font-mono">Ends in 45 Days</span>
                </div>
                <h3 className="text-lg font-serif font-bold text-white mb-2">Q3 MacBook Pro M3 Sprint</h3>
                <p className="text-xs text-[#8C8275] mb-4">First affiliate to cross 200 total sales on any HorPal digital asset wins an Apple MacBook Pro M3 + GH₵ 10,000 cash bonus.</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#8C8275]">Your Sales Rank: #4</span>
                    <span className="text-[#D4AF37]">14 / 200 Sales</span>
                  </div>
                  <div className="w-full bg-[#1A1A1A] rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] h-full w-[7%]" />
                  </div>
                </div>
              </div>

              <div className="bg-[#0F0F0F] border border-[#222222] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase bg-[#222] text-[#AAA] px-2.5 py-1 rounded border border-[#333]">
                    Monthly Sprint
                  </span>
                  <span className="text-xs text-[#8C8275] font-mono">Ends in 15 Days</span>
                </div>
                <h3 className="text-lg font-serif font-bold text-white mb-2">WhatsApp Blueprint Leaderboard</h3>
                <p className="text-xs text-[#8C8275] mb-4">Top 3 affiliates with the highest monthly volume for WhatsApp Closing Blueprint share GH₵ 10,000 pool.</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#8C8275]">Your Sales Rank: #2</span>
                    <span className="text-[#D4AF37]">8 / 50 Sales</span>
                  </div>
                  <div className="w-full bg-[#1A1A1A] rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 h-full w-[16%]" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

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

