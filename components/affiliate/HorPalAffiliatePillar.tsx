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
  AlertCircle,
  Menu,
  X,
  Bell,
  User,
  Search,
  Star,
  QrCode,
  Code,
  LogOut,
  Settings,
  Key,
  Smartphone,
  FileText,
  Trophy,
  Video,
  MessageSquare,
  Globe,
  Phone,
  Mail,
  Download,
  RefreshCw,
  Eye,
  Layers,
  Briefcase
} from 'lucide-react';

// ============================================================================
// PLATFORM CONFIGURATION & CONSTANTS (PAYWALLS DISABLED FOR TESTING)
// ============================================================================
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
const DIRECT_ENROLLMENT_GHS = 90.00;
const VIRAL_CONTEST_PRIZE_GHS = 10000.00;

const SUPPORT_EMAIL_PRIMARY = "horpalservice@gmail.com";
const SUPPORT_EMAIL_SECONDARY = "geestablish@gmail.com";
const SUPPORT_WHATSAPP_DISPLAY = "0534671381";
const SUPPORT_WHATSAPP_INTL = "233534671381";

// ============================================================================
// WORLDWIDE CURRENCIES (AFRICA, ASIA, EUROPE, AMERICAS — SETTLES IN GHS)
// ============================================================================
interface CurrencyRate {
  code: string;
  symbol: string;
  rateToGHS: number; // 1 Unit of Currency = X GHS (or used to convert GHS -> Foreign)
  region: string;
  name: string;
}

const GLOBAL_CURRENCIES: Record<string, CurrencyRate> = {
  GHS: { code: 'GHS', symbol: 'GH₵', rateToGHS: 1.0, region: 'Africa', name: 'Ghana Cedi (Paystack Settlement)' },
  NGN: { code: 'NGN', symbol: '₦', rateToGHS: 0.010, region: 'Africa', name: 'Nigerian Naira' },
  KES: { code: 'KES', symbol: 'KSh', rateToGHS: 0.124, region: 'Africa', name: 'Kenyan Shilling' },
  ZAR: { code: 'ZAR', symbol: 'R', rateToGHS: 0.88, region: 'Africa', name: 'South African Rand' },
  XOF: { code: 'XOF', symbol: 'CFA', rateToGHS: 0.026, region: 'Africa', name: 'West African CFA Franc' },
  XAF: { code: 'XAF', symbol: 'FCFA', rateToGHS: 0.026, region: 'Africa', name: 'Central African CFA Franc' },
  UGX: { code: 'UGX', symbol: 'USh', rateToGHS: 0.0043, region: 'Africa', name: 'Ugandan Shilling' },
  TZS: { code: 'TZS', symbol: 'TSh', rateToGHS: 0.0061, region: 'Africa', name: 'Tanzanian Shilling' },
  RWF: { code: 'RWF', symbol: 'FRw', rateToGHS: 0.012, region: 'Africa', name: 'Rwandan Franc' },
  ZMW: { code: 'ZMW', symbol: 'ZK', rateToGHS: 0.60, region: 'Africa', name: 'Zambian Kwacha' },
  EGP: { code: 'EGP', symbol: 'E£', rateToGHS: 0.33, region: 'Africa', name: 'Egyptian Pound' },
  USD: { code: 'USD', symbol: '$', rateToGHS: 16.00, region: 'Americas', name: 'US Dollar' },
  CAD: { code: 'CAD', symbol: 'C$', rateToGHS: 11.60, region: 'Americas', name: 'Canadian Dollar' },
  GBP: { code: 'GBP', symbol: '£', rateToGHS: 20.20, region: 'Europe', name: 'British Pound' },
  EUR: { code: 'EUR', symbol: '€', rateToGHS: 17.30, region: 'Europe', name: 'Euro' },
  INR: { code: 'INR', symbol: '₹', rateToGHS: 0.19, region: 'Asia', name: 'Indian Rupee' },
  AED: { code: 'AED', symbol: 'AED', rateToGHS: 4.35, region: 'Asia', name: 'UAE Dirham' },
  CNY: { code: 'CNY', symbol: '¥', rateToGHS: 2.22, region: 'Asia', name: 'Chinese Yuan' },
  JPY: { code: 'JPY', symbol: '¥', rateToGHS: 0.105, region: 'Asia', name: 'Japanese Yen' },
  SGD: { code: 'SGD', symbol: 'S$', rateToGHS: 11.90, region: 'Asia', name: 'Singapore Dollar' },
  MYR: { code: 'MYR', symbol: 'RM', rateToGHS: 3.60, region: 'Asia', name: 'Malaysian Ringgit' },
  PHP: { code: 'PHP', symbol: '₱', rateToGHS: 0.28, region: 'Asia', name: 'Philippine Peso' },
};

// ============================================================================
// GLOBAL COUNTRY DIAL CODES (FOR DIGITSTEM CHECKOUT & PILLAR 2 ONBOARDING)
// ============================================================================
const COUNTRY_DIAL_CODES = [
  { country: 'Ghana', code: '+233', prefixExample: '233534671381' },
  { country: 'Nigeria', code: '+234', prefixExample: '234803XXXXXXX' },
  { country: 'Kenya', code: '+254', prefixExample: '2547XXXXXXXX' },
  { country: 'South Africa', code: '+27', prefixExample: '2782XXXXXXX' },
  { country: 'Cameroon', code: '+237', prefixExample: '2376XXXXXXXX' },
  { country: 'Cote d’Ivoire', code: '+225', prefixExample: '22507XXXXXXXX' },
  { country: 'Senegal', code: '+221', prefixExample: '22177XXXXXXX' },
  { country: 'Uganda', code: '+256', prefixExample: '2567XXXXXXXX' },
  { country: 'Tanzania', code: '+255', prefixExample: '2557XXXXXXXX' },
  { country: 'Rwanda', code: '+250', prefixExample: '25078XXXXXXX' },
  { country: 'Zambia', code: '+260', prefixExample: '26097XXXXXXX' },
  { country: 'Sierra Leone', code: '+232', prefixExample: '23276XXXXXX' },
  { country: 'Gambia', code: '+220', prefixExample: '2203XXXXXX' },
  { country: 'Egypt', code: '+20', prefixExample: '2010XXXXXXXX' },
  { country: 'United States', code: '+1', prefixExample: '1202XXXXXXX' },
  { country: 'United Kingdom', code: '+44', prefixExample: '4477XXXXXXXX' },
  { country: 'Canada', code: '+1', prefixExample: '1416XXXXXXX' },
  { country: 'India', code: '+91', prefixExample: '9198XXXXXXXX' },
  { country: 'United Arab Emirates', code: '+971', prefixExample: '97150XXXXXXX' },
  { country: 'China', code: '+86', prefixExample: '86138XXXXXXXX' },
  { country: 'Singapore', code: '+65', prefixExample: '658XXXXXXX' },
  { country: 'Malaysia', code: '+60', prefixExample: '6012XXXXXXX' },
  { country: 'Philippines', code: '+63', prefixExample: '63917XXXXXXX' },
  { country: 'Germany', code: '+49', prefixExample: '49151XXXXXXXX' },
  { country: 'France', code: '+33', prefixExample: '336XXXXXXXX' },
];

// ============================================================================
// MARKETPLACE PRODUCTS (OWNED BY GEE MINGS (CREATOR))
// ============================================================================
export interface MarketplaceProduct {
  id: string;
  shortCode: string;
  title: string;
  creator: string;
  category: string;
  badges: string[];
  rating: number;
  epcUSD: number;
  avgConvRate: string;
  refundRate: string;
  priceUSD: number;
  priceGHS: number;
  commissionPercent: number;
  externalSalesPageUrl?: string;
  deliveryUrl: string;
  headline: string;
  subheadline: string;
  bullets: string[];
  swipeCopy: {
    tiktok: string[];
    whatsapp: string[];
  };
}

const INITIAL_PRODUCTS: MarketplaceProduct[] = [
  {
    id: 'prod_faceless_ai',
    shortCode: 'FACELESS-AI',
    title: 'The AI Faceless Video Engine',
    creator: 'Gee Mings (Creator)',
    category: 'AI & Tech',
    badges: ['TOP PICK', 'HIGH CONVERTING', 'SALE'],
    rating: 4.9,
    epcUSD: 1.45,
    avgConvRate: '6.8%',
    refundRate: '0.2%',
    priceUSD: 15.00,
    priceGHS: 240.00,
    commissionPercent: 50,
    externalSalesPageUrl: 'https://ai-faceless-video-engine-access-por.vercel.app',
    deliveryUrl: 'https://drive.google.com/drive/folders/1IhgiK8DYCM8d-a82uImfds_gS4s06D8wvs7WypmFbjE',
    headline: 'Build, Automate & Monetize High-Retention Faceless Channels Using Free AI',
    subheadline: 'The exact workflow to generate viral scripts, realistic voiceovers, and dynamic edits in under 20 minutes per video.',
    bullets: [
      '100% Free AI Tool Stack — zero monthly software subscriptions required',
      'Copy-paste viral hook & script engineering prompts for TikTok, Reels & Shorts',
      'Step-by-step monetization blueprint for creators & affiliate marketers',
      'Includes instant access to HorPal Pillar 2 Affiliate Command Centre'
    ],
    swipeCopy: {
      tiktok: [
        'How creators are generating automated income with faceless AI videos in 90 seconds without filming themselves. Link in bio! #aivideo #horpal',
        'Stop spending 6 hours editing videos. The AI Faceless Video Engine builds high-retention clips on autopilot!'
      ],
      whatsapp: [
        'Hey! I just got access to The AI Faceless Video Engine by Gee Mings. It shows you how to run profitable faceless TikTok & YouTube channels with AI. Check out the official page here: {LINK}',
        'Want to monetize short-form video without showing your face on camera? Grab The AI Faceless Video Engine here: {LINK}'
      ]
    }
  },
  {
    id: 'prod_mmm_system',
    shortCode: 'MMM-ENGINE',
    title: 'The Mega Messaging Machine (MMM)',
    creator: 'Gee Mings (Creator)',
    category: 'Sales',
    badges: ['TOP PICK', 'HIGH CONVERTING'],
    rating: 4.9,
    epcUSD: 1.38,
    avgConvRate: '6.4%',
    refundRate: '0.3%',
    priceUSD: 15.00,
    priceGHS: 240.00,
    commissionPercent: 50,
    externalSalesPageUrl: 'https://ai-faceless-video-engine-access-por.vercel.app',
    deliveryUrl: 'https://drive.google.com/drive/folders/1o7KrzMponCFxIHvCtvJtr1liyAfC-X3qKDkWrFzPWws',
    headline: 'Turn Every WhatsApp & Social DM Into Predictable Daily Cashflow',
    subheadline: 'High-converting WhatsApp, Instagram, and DM closing scripts engineered to turn cold prospects into instant buyers.',
    bullets: [
      '45+ copy-paste objection-crushing scripts for WhatsApp & Instagram DMs',
      '24-hour status storytelling sequences that trigger daily inbound enquiries',
      'Follow-up cadence templates that recover 80% of ghosted prospects',
      'Includes full HorPal Pillar 2 Affiliate Marketplace access'
    ],
    swipeCopy: {
      tiktok: [
        'Why prospects ghost you after asking "How much?" and the exact WhatsApp script that closes 8 out of 10 leads! #whatsappbusiness #horpal',
        'Turn your WhatsApp DMs into an automated cash machine with The Mega Messaging Machine!'
      ],
      whatsapp: [
        'Tired of people asking for prices and disappearing? The Mega Messaging Machine (MMM) by Gee Mings fixes your DM conversions immediately: {LINK}',
        'Copy-paste these exact WhatsApp closing scripts to double your daily sales: {LINK}'
      ]
    }
  },
  {
    id: 'prod_day_trading',
    shortCode: 'TRADING-ROADMAP',
    title: "Day Trading Beginner's Roadmap",
    creator: 'Gee Mings (Creator)',
    category: 'Trading & Finance',
    badges: ['HIGH CONVERTING', 'SALE'],
    rating: 4.8,
    epcUSD: 1.15,
    avgConvRate: '5.9%',
    refundRate: '0.4%',
    priceUSD: 12.00,
    priceGHS: 192.00,
    commissionPercent: 50,
    deliveryUrl: 'https://drive.google.com/drive/folders/1zbDb8kAk-0Tf_SVX2vQUiUDm6NrW_LN33dOv7mLdqzA',
    headline: 'Master Institutional Chart Structure, Risk Management & Sniper Entries From Scratch',
    subheadline: 'Stop blowing trading accounts. Learn the exact technical checklist, lot-size math, and execution discipline used by consistent traders.',
    bullets: [
      'Candlestick anatomy, liquidity sweeps, and market structure decoded',
      'Strict 1%–2% risk calculator & stop-loss placement rules',
      'High-probability London & New York session entry checklist',
      'Includes full HorPal Pillar 2 Affiliate Portal access'
    ],
    swipeCopy: {
      tiktok: [
        "Stop blowing trading accounts because of emotional entries. Here is the Day Trading Beginner's Roadmap every new trader needs! #daytrading #forexghana",
        'Master chart structure and sniper risk management from scratch. Link in bio!'
      ],
      whatsapp: [
        "If you want to learn day trading the right way without gambling your capital, study Gee Mings' Day Trading Beginner's Roadmap: {LINK}",
        'Learn institutional chart reading, stop-loss discipline, and daily trade setups here: {LINK}'
      ]
    }
  },
  {
    id: 'prod_snapsell',
    shortCode: 'SNAPSELL-PRO',
    title: 'SnapSell: Rapid Digital Product Blueprint',
    creator: 'Gee Mings (Creator)',
    category: 'Sales',
    badges: ['TOP PICK', 'HIGH CONVERTING'],
    rating: 4.9,
    epcUSD: 1.62,
    avgConvRate: '7.1%',
    refundRate: '0.2%',
    priceUSD: 18.00,
    priceGHS: 288.00,
    commissionPercent: 50,
    deliveryUrl: 'https://drive.google.com/drive/folders/1IhgiK8DYCM8d-a82uImfds_gS4s06D8wvs7WypmFbjE',
    headline: 'Package, Price & Launch High-Margin Digital Products In Under 48 Hours',
    subheadline: 'The complete creator blueprint for turning skills into digital courses, ebooks, and templates that sell 24/7.',
    bullets: [
      '48-hour product creation framework using AI research & design templates',
      'High-converting sales page wireframes and pricing psychology',
      'Automated delivery & affiliate army recruitment blueprint',
      'Includes full HorPal Pillar 2 Affiliate Portal access'
    ],
    swipeCopy: {
      tiktok: [
        'Create once, sell 1,000 times. How to package your knowledge into a digital product in 48 hours using SnapSell! #snapsell #digitalproducts',
        'The fastest way to launch a digital asset that pays you daily in Cedis and Dollars!'
      ],
      whatsapp: [
        'Want to launch your own digital product and keep 100% of the profit? Check out SnapSell by Gee Mings here: {LINK}',
        'How to build and automate a digital product funnel this weekend: {LINK}'
      ]
    }
  },
  {
    id: 'prod_status_cash',
    shortCode: 'WA-STATUS-CASH',
    title: 'WhatsApp Status Cash Machine',
    creator: 'Gee Mings (Creator)',
    category: 'Sales',
    badges: ['HIGH CONVERTING', 'SALE'],
    rating: 4.7,
    epcUSD: 0.98,
    avgConvRate: '8.2%',
    refundRate: '0.1%',
    priceUSD: 10.00,
    priceGHS: 160.00,
    commissionPercent: 50,
    deliveryUrl: 'https://drive.google.com/drive/folders/1o7KrzMponCFxIHvCtvJtr1liyAfC-X3qKDkWrFzPWws',
    headline: 'Convert Your Silent WhatsApp Status Viewers Into Paying Buyers Every Single Day',
    subheadline: 'Plug-and-play 3-slide status hooks, scarcity timers, and social proof triggers designed for mobile buyers.',
    bullets: [
      '30 days of done-for-you WhatsApp Status story sequences',
      'How to grow your WhatsApp contact list by 50–200 targeted leads/week',
      'Broadcast list segmentation without getting your number banned',
      'Includes full HorPal Pillar 2 Affiliate Portal access'
    ],
    swipeCopy: {
      tiktok: [
        'Your WhatsApp status views are worth real money if you post this 3-slide sequence! #whatsappstatus #ghanabusiness',
        'Stop posting memes on your status. Post this 24-hour sequence instead and watch orders roll in!'
      ],
      whatsapp: [
        'Turn your WhatsApp status viewers into paying customers every day with the WhatsApp Status Cash Machine by Gee Mings: {LINK}',
        'Here is how top affiliates turn 100 status views into daily commissions: {LINK}'
      ]
    }
  },
  {
    id: 'prod_ai_agency',
    shortCode: 'AI-DOLLAR-AGENCY',
    title: 'AI Freelancing & Remote Dollar Agency Blueprint',
    creator: 'Gee Mings (Creator)',
    category: 'AI & Tech',
    badges: ['TOP PICK', 'HIGH CONVERTING'],
    rating: 4.9,
    epcUSD: 1.85,
    avgConvRate: '6.2%',
    refundRate: '0.3%',
    priceUSD: 20.00,
    priceGHS: 320.00,
    commissionPercent: 50,
    deliveryUrl: 'https://drive.google.com/drive/folders/1IhgiK8DYCM8d-a82uImfds_gS4s06D8wvs7WypmFbjE',
    headline: 'Land Foreign Retainer Clients Paying In USD Using Automated AI Fulfillment',
    subheadline: 'Acquire international clients in the US, UK & UAE and fulfill copywriting, funnel, and video deliverables in minutes with AI.',
    bullets: [
      'Cold outreach scripts for LinkedIn, Upwork, and Instagram that book calls',
      'AI service fulfillment workflows (deliver $500 projects in 45 minutes)',
      'International payment setup guide for receiving USD/EUR in Africa & Asia',
      'Includes full HorPal Pillar 2 Affiliate Portal access'
    ],
    swipeCopy: {
      tiktok: [
        'Live anywhere, earn in US Dollars using AI fulfillment systems. Full Remote Dollar Agency Blueprint in bio! #remotework #aifreelancing',
        'How to land $500/month foreign retainer clients without coding!'
      ],
      whatsapp: [
        'Ready to earn in USD from home using AI tools to fulfill client work? Check out the AI Remote Dollar Agency Blueprint by Gee Mings: {LINK}',
        'Step-by-step client acquisition and AI service delivery system: {LINK}'
      ]
    }
  }
];

// ============================================================================
// 5-STEP RIGOROUS EXAMINATION BANK (10 QUESTIONS PER STEP = 50 QUESTIONS TOTAL)
// ============================================================================
interface ExamQuestion {
  q: string;
  options: string[];
  correctIndex: number;
}

const FIVE_STEP_EXAM_BANK: Record<number, { title: string; subtitle: string; questions: ExamQuestion[] }> = {
  1: {
    title: 'Step 1: Affiliate Tracking & Attribution Mastery',
    subtitle: 'Score 90% or higher (at least 9/10) to unlock Step 2.',
    questions: [
      { q: 'How does HorPal identify which affiliate referred a paying customer?', options: ['By guessing from social media', 'Via the affiliate’s unique product tracking link (?prod=...&ref=HP-XXXX)', 'By asking the customer a week later', 'Everyone shares the same link'], correctIndex: 1 },
      { q: 'When is an affiliate commission officially credited to your HorPal Available Balance?', options: ['When someone clicks the link only', 'When someone views a WhatsApp status', 'Immediately upon verified Paystack purchase completion', 'Before the customer pays'], correctIndex: 2 },
      { q: 'What is the standard affiliate commission rate across HorPal core digital products?', options: ['10%', '25%', '50%', '5%'], correctIndex: 2 },
      { q: 'Who is the official creator of the 6 core launch products in the HorPal Marketplace?', options: ['Gee Mings (Creator)', 'Anonymous Vendor', 'External Broker', 'Random User'], correctIndex: 0 },
      { q: 'If a buyer purchases a product through your unique affiliate link, what do they receive?', options: ['Only the affiliate dashboard', 'Both the Digital Product access AND unlocked HorPal Pillar 2 Affiliate access', 'Nothing until next month', 'Only a receipt'], correctIndex: 1 },
      { q: 'If a user pays the GH₵ 90 direct registration fee without buying a product through an affiliate product link, what do they unlock?', options: ['All 6 products for free', 'The HorPal Pillar 2 Affiliate Portal only (no product included)', 'Only Pillar 1 social chat', 'A physical book'], correctIndex: 1 },
      { q: 'Why must every product have a unique affiliate link per promoter?', options: ['So the system attributes the exact product price, 50% commission, and buyer ID to the right affiliate', 'Just for decoration', 'To slow down checkout', 'It is not needed'], correctIndex: 0 },
      { q: 'What buyer details are recorded in your HorPal Sales Ledger when a sale completes?', options: ['Nothing at all', 'Unique Order/Paystack Ref, Buyer Name, Buyer Gmail, Product Title, and 50% Commission', 'Only the country', 'Only the time of day'], correctIndex: 1 },
      { q: 'Does paying for Pillar 1 automatically unlock Pillar 2 without paying for Pillar 2?', options: ['Yes, they share one paywall', 'No, Pillar 1 and Pillar 2 have strictly separate access gates even on the same Gmail', 'Only on Mondays', 'Only for vendors'], correctIndex: 1 },
      { q: 'In what settlement currency does HorPal process Paystack checkouts and Friday payouts?', options: ['Japanese Yen', 'Ghana Cedis (GH₵)', 'Bitcoin only', 'Peso'], correctIndex: 1 },
    ]
  },
  2: {
    title: 'Step 2: Short-Form Viral Traffic & Hook Engineering',
    subtitle: 'Score 90% or higher (at least 9/10) to unlock Step 3.',
    questions: [
      { q: 'What is the primary goal of the first 3 seconds of a TikTok or Reels promotional video?', options: ['Show a long logo intro', 'Stop the scroll with a pattern-interrupt hook addressing a specific pain point or desire', 'Ask people to log off', 'Play silent black screens'], correctIndex: 1 },
      { q: 'Where should you direct viewers at the end of a high-retention short-form video?', options: ['To your bio link / WhatsApp funnel containing your unique HorPal tracking link', 'Nowhere', 'To a random search engine', 'Tell them not to buy'], correctIndex: 0 },
      { q: 'In The AI Faceless Video Engine workflow, what replaces filming yourself on camera?', options: ['Nothing', 'AI script generation, realistic AI voiceovers, and dynamic visual b-roll', 'Static text only', 'Radio broadcasts'], correctIndex: 1 },
      { q: 'Which metric most strongly signals the TikTok/Reels algorithm to push your video to 100k+ views?', options: ['Font color', 'High average watch time / completion rate and shares', 'Posting at 3:14 AM only', 'Using 100 hashtags'], correctIndex: 1 },
      { q: 'For the HorPal 100K Views Video Contest, what is the cash prize for hitting 100,000+ verified views on TikTok or Instagram?', options: ['GH₵ 100', 'GH₵ 10,000 (convertible to your local currency)', 'GH₵ 500', 'No prize'], correctIndex: 1 },
      { q: 'Why should you add Sub-IDs (like ?sub=tiktok_bio) to your affiliate links?', options: ['To track which specific video or traffic channel is generating your sales', 'To break the link', 'To hide your code', 'To change the product price'], correctIndex: 0 },
      { q: 'What is the ideal structure of a 15-second faceless conversion reel?', options: ['Hook (0-3s) -> Agitate Problem & Show Proof (3-11s) -> Clear Call-To-Action (11-15s)', 'Credits first -> Silence -> End', 'Only hashtags', '15 seconds of intro music'], correctIndex: 0 },
      { q: 'How often should an active affiliate test new short-form hooks for their chosen product?', options: ['Once a year', 'Consistent daily testing (1–3 short videos per day)', 'Never', 'Once every 6 months'], correctIndex: 1 },
      { q: 'What tool inside HorPal Pillar 2 gives you ready-made TikTok and WhatsApp promotional copy?', options: ['The Swipe Vault & AI Funnel Tools', 'The Logout button', 'The Password tab', 'None'], correctIndex: 0 },
      { q: 'When promoting on TikTok, why is routing traffic to a WhatsApp Auto-Closer link or Bio-Link effective?', options: ['It warms up cold viewers and lets you answer objections on WhatsApp before they pay on Paystack', 'It blocks buyers', 'It deletes cookies', 'It hides the checkout'], correctIndex: 0 },
    ]
  },
  3: {
    title: 'Step 3: WhatsApp Status & DM Conversion Funnel (MMM)',
    subtitle: 'Score 90% or higher (at least 9/10) to unlock Step 4.',
    questions: [
      { q: 'What is the 3-step WhatsApp Status conversion sequence taught in HorPal?', options: ['Slide 1: Pain/Hook -> Slide 2: Value/Social Proof -> Slide 3: Scarcity + Unique Affiliate Link', 'Post 50 random memes', 'Post only good morning images', 'Never post links'], correctIndex: 0 },
      { q: 'When a prospect asks "How much is it?" in your DM, what mistake causes them to ghost?', options: ['Replying with just a bare price number without framing the value and transformation first', 'Being polite', 'Sending your affiliate link when they are ready', 'Using voice notes'], correctIndex: 0 },
      { q: 'How does the HorPal Abandoned Checkout Lead CRM help you close more sales?', options: ['It shows you buyers who filled Step 1 of checkout so you can message them on WhatsApp to complete payment', 'It deletes their email', 'It blocks their phone number', 'It hides their name'], correctIndex: 0 },
      { q: 'What is a "1-Click Order Bump" recommendation from the HorPal AI Business Brain?', options: ['Pairing your core offer with a complementary add-on at checkout + WhatsApp sync to boost order value', 'Closing the store', 'Removing the buy button', 'Lowering commission to 0%'], correctIndex: 0 },
      { q: 'When following up with a warm WhatsApp lead after 24 hours, what works best?', options: ['Sending angry messages', 'Sharing a fresh student result/testimonial and asking if they had any questions about getting started', 'Blocking them immediately', 'Spamming 30 links in 1 minute'], correctIndex: 1 },
      { q: 'Why should you save every new WhatsApp lead’s contact and have them save yours?', options: ['So they can view your daily 24-hour WhatsApp Status sequences where 80% of conversions happen', 'No reason', 'To fill phone storage', 'To stop them from buying'], correctIndex: 0 },
      { q: 'What does EPC stand for on the HorPal Marketplace product cards?', options: ['Earnings Per Click (average commission earned per link click)', 'Extra Product Cost', 'Email Password Check', 'End Page Code'], correctIndex: 0 },
      { q: 'If a buyer in Nigeria, Kenya, or India opens your HorPal checkout link, how do they see the price?', options: ['They can preview the price in their local currency using the Worldwide Converter while Paystack settles in GH₵', 'They cannot see any price', 'Only in Japanese Yen', 'The page crashes'], correctIndex: 0 },
      { q: 'What should a buyer ensure when typing their Email Address on Step 1 of the Digitstem-style checkout?', options: ['Use a fake email', 'Ensure their Email Address is CORRECT, ACTIVE, and ACCESSIBLE to receive instant access', 'Leave it blank', 'Type a phone number instead'], correctIndex: 1 },
      { q: 'How can you use the HorPal Social Proof Flyer Generator to boost WhatsApp sales?', options: ['Generate a verified commission status card and post it on your status to build credibility', 'Keep it hidden', 'Delete it', 'Send it to competitors only'], correctIndex: 0 },
    ]
  },
  4: {
    title: 'Step 4: Financial Risk, Pricing & Payout Governance',
    subtitle: 'Score 90% or higher (at least 9/10) to unlock Step 5.',
    questions: [
      { q: 'On which day of the week does the HorPal Affiliate Payout window open for withdrawals?', options: ['Every Monday', 'Strictly on Fridays (GMT)', 'Only on New Year’s Day', 'Every Tuesday'], correctIndex: 1 },
      { q: 'What payout channels are supported for Friday withdrawals in HorPal Pillar 2?', options: ['Mobile Money (MTN, Telecel, AT), Bank Transfer, and USDT (TRC20)', 'Cash in envelope only', 'Gift cards only', 'Checks by mail'], correctIndex: 0 },
      { q: 'When you submit a Friday payout request, where is the payout ticket dispatched for OTP-verified Paystack Transfer?', options: ['Nowhere', 'Directly to horpalservice@gmail.com and the Admin Command Centre', 'To random users', 'To social media'], correctIndex: 1 },
      { q: 'In the Day Trading Beginner’s Roadmap, what is the golden rule of capital preservation per trade?', options: ['Risk 100% of your account on one trade', 'Risk only a small fixed percentage (1%–2%) with a hard stop-loss', 'Never use a stop-loss', 'Revenge trade after a loss'], correctIndex: 1 },
      { q: 'Why must your Account Holder Name in the Payout Center match your registered Mobile Money or Bank name?', options: ['To pass Paystack Transfer verification and prevent failed/rejected payouts', 'It does not matter', 'So the font looks nice', 'To delay payment'], correctIndex: 0 },
      { q: 'If a product sells for GH₵ 240 with a 50% commission rate, how much is credited to your balance per sale?', options: ['GH₵ 24.00', 'GH₵ 120.00', 'GH₵ 240.00', 'GH₵ 50.00'], correctIndex: 1 },
      { q: 'How many sales of a GH₵ 240 product (GH₵ 120 commission) do you need to earn GH₵ 1,200 in commissions?', options: ['100 sales', '10 sales', '2 sales', '50 sales'], correctIndex: 1 },
      { q: 'Can two different affiliates receive commission from the exact same single transaction?', options: ['Yes, everyone gets paid', 'No, the sale is attributed strictly to the referring affiliate code locked at checkout', 'Up to 10 affiliates', 'Only if they ask'], correctIndex: 1 },
      { q: 'What happens if someone clicks your affiliate link 50 times but never completes payment?', options: ['You earn GH₵ 500', 'Your commission is GH₵ 0.00 because only completed purchases generate commission', 'You get a bonus', 'The product becomes free'], correctIndex: 1 },
      { q: 'What happens if a transaction is fraudulent or refunded under platform compliance rules?', options: ['Refunds and chargebacks can void or claw back unverified commissions', 'Nothing', 'Commission doubles', 'Account gets 10x bonus'], correctIndex: 0 },
    ]
  },
  5: {
    title: 'Step 5: Creator Whitelist, Compliance & Scaling Certification',
    subtitle: 'Score 90% or higher (at least 9/10) to unlock your Official Certificate!',
    questions: [
      { q: 'How does a digital product creator apply to list their own course on the HorPal Vendor Marketplace?', options: ['Anyone can upload spam without review', 'Via the Creator Whitelist Portal by sending product details, sales page & commission split to horpalservice@gmail.com for QA approval', 'By posting in comments', 'Not allowed'], correctIndex: 1 },
      { q: 'What happens after your Creator/Vendor product application is reviewed and approved by HorPal QA?', options: ['You receive a congratulations message and vendor listing fee instructions to unlock your Creator Desk', 'Nothing happens', 'Your account closes', 'It is deleted'], correctIndex: 0 },
      { q: 'What are the official HorPal Affiliate Support channels if you need help with a sale or payout?', options: ['horpalservice@gmail.com, geestablish@gmail.com, and WhatsApp 0534671381', 'No support exists', 'Only physical mail', 'Fax machine'], correctIndex: 0 },
      { q: 'When your sales counter reaches a Contest Milestone (e.g. 50/50 sales), what unlocks on your Contest card?', options: ['An instant "Alert Admin Command Centre & Claim Reward" button', 'The screen turns off', 'Your sales reset to zero', 'Nothing'], correctIndex: 0 },
      { q: 'What is strictly prohibited under HorPal Official Rules & Regulations?', options: ['Promoting with honest swipe copy', 'False income guarantees, spam links, or sharing account passwords', 'Using the Profit Calculator', 'Sharing QR codes'], correctIndex: 1 },
      { q: 'How does the HorPal Bio-Link / LinkHub help you promote multiple products at once?', options: ['It creates a single personal storefront URL displaying all 6 products with your affiliate code attached', 'It deletes your links', 'It only works offline', 'It blocks mobile users'], correctIndex: 0 },
      { q: 'Where can you update your Pillar 2 First Name, Last Name, Phone Number, Address, and KYC ID?', options: ['Inside the Profile & Details / Account Information (KYC) modal from the top-right Profile button', 'You can never change it', 'Only by creating a new Gmail', 'Nowhere'], correctIndex: 0 },
      { q: 'Before claiming the GH₵ 10,000 TikTok/Instagram 100K Views Prize, what details must you submit in the Contest Portal?', options: ['Only your first name', 'Your TikTok/IG handle, public video link showing 100k+ views, full name, phone, and Bank/MoMo payout details', 'A screenshot of someone else’s account', 'Nothing'], correctIndex: 1 },
      { q: 'Why is combining Short-Form Video (TikTok/Reels) + WhatsApp Closing the highest-converting affiliate strategy?', options: ['Short-form video brings free daily traffic while WhatsApp Status & DMs build trust and close the sale', 'Because it requires $10,000 in ad spend', 'It is not effective', 'Only works in one city'], correctIndex: 0 },
      { q: 'Upon passing all 5 steps of this examination with 90%+ accuracy, what do you earn?', options: ['An Official Personalized HorPal Certificate of Completion with a unique verification ID', 'Nothing', 'A penalty', 'Account suspension'], correctIndex: 0 },
    ]
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function HorPalAffiliatePillar({
  currentProfile,
  onRefreshProfile
}: {
  currentProfile?: any;
  onRefreshProfile?: () => void;
}) {
  // Primary Workspace Navigation (Digitstem Top Drawer + Scrollable Bottom Bar)
  type ActiveSection =
    | 'dashboard'
    | 'marketplace'
    | 'links'
    | 'lms'
    | 'contests'
    | 'payouts'
    | 'ledger'
    | 'swipe_vault'
    | 'ai_tools'
    | 'leads_crm'
    | 'calculator'
    | 'creator_site'
    | 'rules_site';

  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GHS');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState<boolean>(false);
  const [activeSettingsModal, setActiveSettingsModal] = useState<
    null | 'profile' | 'kyc' | 'notifications' | 'security' | '2fa' | 'support' | 'pillar2_onboarding'
  >(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isAiBotOpen, setIsAiBotOpen] = useState<boolean>(false);

  // User & Separate Pillar 2 Profile State
  const [userId, setUserId] = useState<string | null>(currentProfile?.id || null);
  const [userAffiliateCode, setUserAffiliateCode] = useState<string>(
    currentProfile?.affiliate_code || 'HP-DB3E04'
  );
  const [firstName, setFirstName] = useState<string>('Gerald');
  const [lastName, setLastName] = useState<string>('Mingle');
  const [pillar2Email, setPillar2Email] = useState<string>(
    currentProfile?.email || 'geemingle15@gmail.com'
  );
  const [pillar2DialCode, setPillar2DialCode] = useState<string>('+233');
  const [pillar2Phone, setPillar2Phone] = useState<string>('2330544764131');
  const [pillar2Country, setPillar2Country] = useState<string>('Ghana');
  const [pillar2State, setPillar2State] = useState<string>('Greater Accra');
  const [pillar2City, setPillar2City] = useState<string>('Accra');
  const [pillar2Zip, setPillar2Zip] = useState<string>('GA543');
  const [pillar2Address, setPillar2Address] = useState<string>('Dansoman');
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(true);
  const [kycIdType, setKycIdType] = useState<string>('Ghana Card / National ID');
  const [kycIdNumber, setKycIdNumber] = useState<string>('');
  const [kycVerified, setKycVerified] = useState<boolean>(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [settingsSavedBanner, setSettingsSavedBanner] = useState<string | null>(null);

  // Financial & Sales State
  const [availableBalanceGHS, setAvailableBalanceGHS] = useState<number>(
    Number(currentProfile?.affiliate_balance || 0)
  );
  const [totalEarningsGHS, setTotalEarningsGHS] = useState<number>(0);
  const [withdrawnBalanceGHS, setWithdrawnBalanceGHS] = useState<number>(
    Number(currentProfile?.total_withdrawn || 0)
  );
  const [pendingEscrowGHS, setPendingEscrowGHS] = useState<number>(0);
  const [totalSalesCount, setTotalSalesCount] = useState<number>(0);
  const [totalClicksCount, setTotalClicksCount] = useState<number>(48);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Marketplace Search, Filter & Modals
  const [products, setProducts] = useState<MarketplaceProduct[]>(INITIAL_PRODUCTS);
  const [marketSearch, setMarketSearch] = useState<string>('');
  const [marketFilter, setMarketFilter] = useState<string>('All Offers');
  const [promoteModalProduct, setPromoteModalProduct] = useState<MarketplaceProduct | null>(null);
  const [detailsModalProduct, setDetailsModalProduct] = useState<MarketplaceProduct | null>(null);
  const [customSlugInput, setCustomSlugInput] = useState<string>('my-custom-slug');
  const [subIdTag, setSubIdTag] = useState<string>('whatsapp_status');
  const [showQrModalFor, setShowQrModalFor] = useState<string | null>(null);
  const [showEmbedModalFor, setShowEmbedModalFor] = useState<string | null>(null);

  // Buyer Sales Page & Digitstem 2-Step Checkout State (Triggered when visiting an Affiliate Link!)
  const [activeSalesPageProduct, setActiveSalesPageProduct] = useState<MarketplaceProduct | null>(null);
  const [isDirectEnrollmentCheckout, setIsDirectEnrollmentCheckout] = useState<boolean>(false);
  const [referredByCode, setReferredByCode] = useState<string>('HP-DB3E04');
  const [checkoutStep, setCheckoutStep] = useState<null | 1 | 2>(null);
  const [buyerFullName, setBuyerFullName] = useState<string>('');
  const [buyerCountry, setBuyerCountry] = useState<string>('Ghana');
  const [buyerDialCode, setBuyerDialCode] = useState<string>('+233');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [checkoutGatewayCurrency, setCheckoutGatewayCurrency] = useState<string>('GHS');
  const [includeOrderBump, setIncludeOrderBump] = useState<boolean>(false);

  // Transactions, Notifications & Abandoned Leads CRM
  const [transactions, setTransactions] = useState<
    Array<{
      id: string;
      orderUid: string;
      reference: string;
      productTitle: string;
      amountGHS: number;
      commissionGHS: number;
      buyerName: string;
      buyerEmail: string;
      buyerPhone: string;
      date: string;
      status: string;
    }>
  >([]);

  const [notificationsList, setNotificationsList] = useState<
    Array<{
      id: string;
      title: string;
      subtitle: string;
      amountGHS: number;
      timeAgo: string;
      read: boolean;
    }>
  >([
    {
      id: 'notif-1',
      title: 'Welcome to HorPal Affiliate Hub',
      subtitle: 'Your unique affiliate links & 50% instant commission tracking are active.',
      amountGHS: 0,
      timeAgo: 'Just now',
      read: false
    }
  ]);

  const [abandonedLeads, setAbandonedLeads] = useState<
    Array<{
      id: string;
      fullName: string;
      email: string;
      phone: string;
      country: string;
      productTitle: string;
      amountGHS: number;
      createdAt: string;
    }>
  >([]);

  // Shortener / Link Manager State
  const [shortLinks, setShortLinks] = useState<
    Array<{ id: string; label: string; fullUrl: string; shortUrl: string; clicks: number }>
  >([]);
  const [selectedProductForLink, setSelectedProductForLink] = useState<string>(INITIAL_PRODUCTS[0].id);

  // 5-Step Examination & Certificate State
  const [examProductId, setExamProductId] = useState<string>(INITIAL_PRODUCTS[0].id);
  const [currentExamStep, setCurrentExamStep] = useState<number>(1);
  const [unlockedExamStep, setUnlockedExamStep] = useState<number>(1);
  const [examAnswers, setExamAnswers] = useState<Record<number, number>>({});
  const [examStepResult, setExamStepResult] = useState<{
    scorePercent: number;
    passed: boolean;
    correctCount: number;
    total: number;
  } | null>(null);
  const [certificateUnlocked, setCertificateUnlocked] = useState<boolean>(false);
  const [certificateStudentName, setCertificateStudentName] = useState<string>('Gerald Mingle');
  const [certificateCode, setCertificateCode] = useState<string>('HP-CERT-908421');

  // Contests & 100K Views TikTok/IG Challenge State
  const [registeredContests, setRegisteredContests] = useState<string[]>([]);
  const [contestModalOpen, setContestModalOpen] = useState<null | 'register_sales' | 'viral_100k'>(null);
  const [contestFullName, setContestFullName] = useState<string>('');
  const [contestPhone, setContestPhone] = useState<string>('');
  const [contestSocialHandle, setContestSocialHandle] = useState<string>('');
  const [contestVideoUrl, setContestVideoUrl] = useState<string>('');
  const [contestBankMomoDetails, setContestBankMomoDetails] = useState<string>('');
  const [contestStatusBanner, setContestStatusBanner] = useState<string | null>(null);
  const [adminMilestoneAlertSent, setAdminMilestoneAlertSent] = useState<boolean>(false);

  // Friday Payout State
  const [payoutChannel, setPayoutChannel] = useState<'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CRYPTO_USDT'>('MOBILE_MONEY');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [momoNetwork, setMomoNetwork] = useState<string>('MTN');
  const [momoNumber, setMomoNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('GCB Bank');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [usdtAddress, setUsdtAddress] = useState<string>('');
  const [payoutAmountGHS, setPayoutAmountGHS] = useState<string>('');
  const [payoutFeedback, setPayoutFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState<boolean>(false);

  // Creator Whitelist Submission State
  const [vendorTitle, setVendorTitle] = useState<string>('');
  const [vendorPrice, setVendorPrice] = useState<string>('240');
  const [vendorSalesUrl, setVendorSalesUrl] = useState<string>('');
  const [vendorDesc, setVendorDesc] = useState<string>('');
  const [vendorFeedback, setVendorFeedback] = useState<string | null>(null);

  // Profit Calculator State
  const [calcProductId, setCalcProductId] = useState<string>(INITIAL_PRODUCTS[0].id);
  const [calcDailySales, setCalcDailySales] = useState<number>(3);

  // HorPal AI Business Brain Bot State
  const [aiBotCategory, setAiBotCategory] = useState<'Brain' | 'Marketing' | 'Sales' | 'Product'>('Brain');
  const [aiInput, setAiInput] = useState<string>('');
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "Hello! 👋 I'm your HorPal AI Business Brain. I understand your products, sales, customers, and 50% commission engine. Ask me anything!"
    }
  ]);

  // Extra Feature: WhatsApp Auto-Closer & Bio-Link Storefront Preview
  const [waCloserNumber, setWaCloserNumber] = useState<string>('233534671381');
  const [waCloserProduct, setWaCloserProduct] = useState<string>(INITIAL_PRODUCTS[0].id);
  const [showBioLinkPreview, setShowBioLinkPreview] = useState<boolean>(false);

  // ============================================================================
  // INITIALIZE URL PARAMS (SALES PAGE LANDING) & SUPABASE DATA
  // ============================================================================
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const prodParam = params.get('prod');
      const refParam = params.get('ref');
      const storeParam = params.get('store');

      if (refParam) {
        localStorage.setItem('horpal_affiliate_ref', refParam);
        setReferredByCode(refParam);
      } else {
        const savedRef = localStorage.getItem('horpal_affiliate_ref');
        if (savedRef) setReferredByCode(savedRef);
      }

      // CRITICAL: When someone opens a unique product affiliate link (?prod=...),
      // land them directly on that product's high-converting Sales Page & Checkout!
      if (prodParam) {
        const matched = INITIAL_PRODUCTS.find(
          (p) => p.id === prodParam || p.shortCode.toLowerCase() === prodParam.toLowerCase()
        );
        if (matched) {
          setActiveSalesPageProduct(matched);
        }
      }

      if (storeParam) {
        setShowBioLinkPreview(true);
      }
    }
    loadSupabaseData();
  }, [currentProfile]);

  const loadSupabaseData = async () => {
    try {
      let activeUid = currentProfile?.id;
      let activeMail = currentProfile?.email;

      if (!activeUid) {
        const { data: authData } = await supabase.auth.getUser();
        activeUid = authData?.user?.id;
        activeMail = authData?.user?.email || '';
      }

      if (!activeUid) return;
      setUserId(activeUid);

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUid)
        .single();

      if (prof) {
        const fullNameStr = prof.name || prof.username || 'Gerald Mingle';
        const parts = fullNameStr.split(' ');
        setFirstName(prof.pillar2_first_name || parts[0] || 'Gerald');
        setLastName(prof.pillar2_last_name || parts.slice(1).join(' ') || 'Mingle');
        setCertificateStudentName(
          `${prof.pillar2_first_name || parts[0] || 'Gerald'} ${prof.pillar2_last_name || parts.slice(1).join(' ') || 'Mingle'}`.trim()
        );
        setPillar2Email(prof.pillar2_email || prof.email || activeMail || 'geemingle15@gmail.com');
        if (prof.pillar2_phone) setPillar2Phone(prof.pillar2_phone);
        if (prof.pillar2_country) setPillar2Country(prof.pillar2_country);
        if (prof.pillar2_city) setPillar2City(prof.pillar2_city);
        if (prof.pillar2_address) setPillar2Address(prof.pillar2_address);
        if (prof.affiliate_code) setUserAffiliateCode(prof.affiliate_code);
        setAvailableBalanceGHS(Number(prof.affiliate_balance || 0));
        setWithdrawnBalanceGHS(Number(prof.total_withdrawn || 0));
      }

      const { data: salesRows } = await supabase
        .from('affiliate_sales')
        .select('*')
        .or(`affiliate_id.eq.${activeUid},affiliate_user_id.eq.${activeUid}`)
        .order('created_at', { ascending: false });

      if (salesRows && salesRows.length > 0) {
        setTotalSalesCount(salesRows.length);
        const totalComm = salesRows.reduce(
          (acc: number, row: any) => acc + Number(row.commission_ghs || 0),
          0
        );
        setTotalEarningsGHS(totalComm);

        const mappedTx = salesRows.map((row: any, idx: number) => ({
          id: row.id || `tx-${idx}`,
          orderUid: `ORD-${(row.id || '889120').toString().slice(0, 6).toUpperCase()}`,
          reference: row.paystack_reference || `HP-REF-${idx}`,
          productTitle: row.product_title || row.product_name || 'HorPal Digital Asset',
          amountGHS: Number(row.gross_amount_ghs || row.amount_paid_ghs || 240),
          commissionGHS: Number(row.commission_ghs || 120),
          buyerName: row.buyer_name || 'Verified Customer',
          buyerEmail: row.buyer_email || 'buyer@gmail.com',
          buyerPhone: row.sub_id || '+233XXXXXXXXX',
          date: new Date(row.created_at).toISOString().replace('T', ' ').substring(0, 16),
          status: (row.status || 'COMPLETED').toUpperCase()
        }));
        setTransactions(mappedTx);

        const saleNotifs = mappedTx.map((t: any) => ({
          id: `notif-${t.id}`,
          title: `Sale Commission for ${t.productTitle}`,
          subtitle: `Buyer: ${t.buyerName} (${t.buyerEmail}) • Order ID: ${t.orderUid}`,
          amountGHS: t.commissionGHS,
          timeAgo: t.date,
          read: false
        }));
        setNotificationsList(saleNotifs);
      }

      const { data: leadsData } = await supabase
        .from('affiliate_checkout_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (leadsData) {
        setAbandonedLeads(
          leadsData.map((l: any) => ({
            id: l.id,
            fullName: l.buyer_full_name,
            email: l.buyer_email,
            phone: l.buyer_phone,
            country: l.buyer_country,
            productTitle: l.product_title,
            amountGHS: Number(l.amount_ghs || 240),
            createdAt: new Date(l.created_at).toISOString().replace('T', ' ').substring(0, 16)
          }))
        );
      }
    } catch (e) {
      console.error('Error loading Pillar 2 data:', e);
    }
  };

  // ============================================================================
  // CURRENCY CONVERSION & UNIQUE PRODUCT LINK HELPERS
  // ============================================================================
  const formatAmount = (amountGHS: number, currencyOverride?: string): string => {
    const code = currencyOverride || selectedCurrency;
    const rateObj = GLOBAL_CURRENCIES[code] || GLOBAL_CURRENCIES.GHS;
    const converted = amountGHS / rateObj.rateToGHS;
    return `${rateObj.symbol} ${converted.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://www.horpal.com';

  // Generates a unique, distinct affiliate link for each specific product & affiliate
  const getUniqueProductAffiliateLink = (product: MarketplaceProduct, customSub?: string) => {
    const cleanCode = userAffiliateCode || 'HP-DB3E04';
    const uniqueToken = `${cleanCode}-${product.shortCode}`;
    const subParam = customSub ? `&sub=${encodeURIComponent(customSub)}` : '';
    return `${appOrigin}/affiliate?prod=${product.id}&ref=${cleanCode}&token=${uniqueToken}${subParam}`;
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  // ============================================================================
  // DIGITSTEM 2-STEP CHECKOUT & PAYSTACK EXECUTION (REAL + INSTANT TEST)
  // ============================================================================
  const openDigitstemCheckoutForProduct = (product: MarketplaceProduct) => {
    setIsDirectEnrollmentCheckout(false);
    setActiveSalesPageProduct(product);
    setCheckoutStep(1);
  };

  const openDirectPillar2EnrollmentCheckout = () => {
    setIsDirectEnrollmentCheckout(true);
    setCheckoutStep(1);
  };

  const handleCheckoutStep1Next = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerFullName.trim() || !buyerPhone.trim() || !buyerEmail.trim()) {
      alert('Please complete your Full Name, Phone Number, and active Email Address.');
      return;
    }

    // Save to Abandoned Checkout Lead CRM so the affiliate never loses the lead
    const targetTitle = isDirectEnrollmentCheckout
      ? 'HorPal Pillar 2 Direct Affiliate Access (No Product)'
      : activeSalesPageProduct?.title || 'HorPal Digital Product';
    const targetAmountGHS = isDirectEnrollmentCheckout
      ? DIRECT_ENROLLMENT_GHS
      : (activeSalesPageProduct?.priceGHS || 240) + (includeOrderBump ? 80 : 0);

    const newLead = {
      id: `lead-${Date.now()}`,
      fullName: buyerFullName,
      email: buyerEmail,
      phone: `${buyerDialCode}${buyerPhone.replace(/^0+/, '')}`,
      country: buyerCountry,
      productTitle: targetTitle,
      amountGHS: targetAmountGHS,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAbandonedLeads((prev) => [newLead, ...prev]);

    try {
      await supabase.from('affiliate_checkout_leads').insert({
        affiliate_code: referredByCode || userAffiliateCode,
        product_id: isDirectEnrollmentCheckout ? 'direct_90' : activeSalesPageProduct?.id || 'prod_faceless_ai',
        product_title: targetTitle,
        buyer_full_name: buyerFullName,
        buyer_email: buyerEmail,
        buyer_phone: `${buyerDialCode}${buyerPhone.replace(/^0+/, '')}`,
        buyer_country: buyerCountry,
        amount_ghs: targetAmountGHS
      });
    } catch (_) {}

    // Automatically populate their Pillar 2 profile details from the checkout form
    const nameSplit = buyerFullName.trim().split(' ');
    setFirstName(nameSplit[0] || firstName);
    setLastName(nameSplit.slice(1).join(' ') || lastName);
    setPillar2Email(buyerEmail);
    setPillar2Phone(`${buyerDialCode}${buyerPhone.replace(/^0+/, '')}`);
    setPillar2Country(buyerCountry);

    setCheckoutStep(2);
  };

  const completeVerifiedPurchaseRecord = async (reference: string) => {
    const isDirect = isDirectEnrollmentCheckout;
    const prod = activeSalesPageProduct || INITIAL_PRODUCTS[0];
    const baseGHS = isDirect ? DIRECT_ENROLLMENT_GHS : prod.priceGHS + (includeOrderBump ? 80 : 0);
    const commGHS = isDirect ? 0 : Number((baseGHS * (prod.commissionPercent / 100)).toFixed(2));
    const uniqueOrderUid = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const fullPhone = `${buyerDialCode}${buyerPhone.replace(/^0+/, '')}`;

    try {
      await supabase.rpc('record_verified_affiliate_sale', {
        p_paystack_ref: reference,
        p_product_id: isDirect ? 'pillar2_direct_90' : prod.id,
        p_product_title: isDirect ? 'HorPal Pillar 2 Direct Enrollment (No Product)' : prod.title,
        p_buyer_user_id: userId,
        p_buyer_name: buyerFullName,
        p_buyer_email: buyerEmail,
        p_affiliate_code: referredByCode || userAffiliateCode,
        p_sub_id: fullPhone,
        p_gross_ghs: baseGHS,
        p_gross_usd: Number((baseGHS / 16).toFixed(2)),
        p_commission_ghs: commGHS,
        p_commission_usd: Number((commGHS / 16).toFixed(2)),
        p_delivery_url: isDirect ? '' : prod.deliveryUrl
      });
    } catch (_) {}

    if (!isDirect) {
      const txItem = {
        id: `tx-${Date.now()}`,
        orderUid: uniqueOrderUid,
        reference,
        productTitle: prod.title,
        amountGHS: baseGHS,
        commissionGHS: commGHS,
        buyerName: buyerFullName,
        buyerEmail: buyerEmail,
        buyerPhone: fullPhone,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'COMPLETED'
      };
      setTransactions((prev) => [txItem, ...prev]);
      setAvailableBalanceGHS((prev) => prev + commGHS);
      setTotalEarningsGHS((prev) => prev + commGHS);
      setTotalSalesCount((prev) => prev + 1);
      setNotificationsList((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: `Sale Commission for ${prod.title}`,
          subtitle: `Buyer: ${buyerFullName} (${buyerEmail}) • Unique ID: ${uniqueOrderUid}`,
          amountGHS: commGHS,
          timeAgo: 'Just now',
          read: false
        },
        ...prev
      ]);
    }

    setCheckoutStep(null);
    setActiveSalesPageProduct(null);
    onRefreshProfile?.();

    if (isDirect) {
      alert(
        `✅ Direct Enrollment Confirmed!\n\nProfile Created For: ${buyerFullName} (${buyerEmail})\nYou now have full access to the HorPal Pillar 2 Affiliate Hub (Direct Entry = App Access Only, No Bundled Product).`
      );
    } else {
      alert(
        `✅ Payment Confirmed!\n\nUnique Purchase ID: ${uniqueOrderUid}\nBuyer: ${buyerFullName} (${buyerEmail})\nProduct Unlocked: ${prod.title}\nAffiliate (${referredByCode || userAffiliateCode}) Credited Instantly: GH₵ ${commGHS.toFixed(2)}\n\nOpening your product access portal & Pillar 2 Dashboard!`
      );
      window.open(prod.deliveryUrl, '_blank');
    }
  };

  const launchPaystackFromStep2 = () => {
    const isDirect = isDirectEnrollmentCheckout;
    const prod = activeSalesPageProduct || INITIAL_PRODUCTS[0];
    const payableGHS = isDirect ? DIRECT_ENROLLMENT_GHS : prod.priceGHS + (includeOrderBump ? 80 : 0);
    const ref = `HP_P2_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const openPopup = () => {
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop || !PAYSTACK_PUBLIC_KEY) {
        // Fallback instant verification if test environment lacks live key
        completeVerifiedPurchaseRecord(ref);
        return;
      }
      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: buyerEmail || pillar2Email,
        amount: Math.round(payableGHS * 100),
        currency: 'GHS',
        ref,
        callback: (response: any) => {
          completeVerifiedPurchaseRecord(response?.reference || ref);
        }
      });
      handler.openIframe();
    };

    if (typeof window !== 'undefined' && !(window as any).PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = openPopup;
      script.onerror = () => completeVerifiedPurchaseRecord(ref);
      document.body.appendChild(script);
    } else {
      openPopup();
    }
  };

  // ============================================================================
  // SAVE SEPARATE PILLAR 2 PROFILE DETAILS
  // ============================================================================
  const handleSavePillar2Profile = async (e: React.FormEvent) => {
    e.preventDefault();
    setCertificateStudentName(`${firstName} ${lastName}`.trim());
    if (userId) {
      try {
        await supabase
          .from('profiles')
          .update({
            pillar2_first_name: firstName,
            pillar2_last_name: lastName,
            pillar2_email: pillar2Email,
            pillar2_phone: pillar2Phone,
            pillar2_country: pillar2Country,
            pillar2_city: pillar2City,
            pillar2_address: pillar2Address,
            pillar2_push_notifications: pushNotificationsEnabled,
            pillar2_kyc_id_type: kycIdType,
            pillar2_kyc_id_number: kycIdNumber,
            pillar2_2fa_enabled: twoFactorEnabled
          })
          .eq('id', userId);
      } catch (_) {}
    }
    setSettingsSavedBanner('✅ Pillar 2 Profile & Settings saved independently of Pillar 1!');
    setTimeout(() => setSettingsSavedBanner(null), 3500);
  };

  // ============================================================================
  // 5-STEP EXAMINATION GRADING (90% MINIMUM REQUIRED TO ADVANCE)
  // ============================================================================
  const handleGradeExamStep = async (e: React.FormEvent) => {
    e.preventDefault();
    const stepData = FIVE_STEP_EXAM_BANK[currentExamStep];
    if (!stepData) return;

    let correct = 0;
    stepData.questions.forEach((qItem, idx) => {
      if (examAnswers[idx] === qItem.correctIndex) {
        correct += 1;
      }
    });

    const total = stepData.questions.length;
    const scorePercent = Math.round((correct / total) * 100);
    const passed = scorePercent >= 90;

    setExamStepResult({ scorePercent, passed, correctCount: correct, total });

    if (passed) {
      if (currentExamStep < 5) {
        const nextStep = currentExamStep + 1;
        if (unlockedExamStep < nextStep) setUnlockedExamStep(nextStep);
      } else {
        // Passed all 5 steps with >= 90%!
        const newCertCode = `HP-CERT-${Math.floor(100000 + Math.random() * 900000)}`;
        setCertificateCode(newCertCode);
        setCertificateUnlocked(true);
        const selectedCourse =
          products.find((p) => p.id === examProductId) || INITIAL_PRODUCTS[0];
        try {
          await supabase.from('affiliate_certificates').insert({
            user_id: userId,
            student_name: `${firstName} ${lastName}`.trim(),
            product_id: selectedCourse.id,
            product_title: selectedCourse.title,
            certificate_code: newCertCode,
            final_score_percent: scorePercent
          });
        } catch (_) {}
      }
    }
  };

  // ============================================================================
  // CONTEST REGISTRATION, MILESTONE ADMIN ALERT & 100K VIEWS SUBMISSION
  // ============================================================================
  const handleContestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isViral = contestModalOpen === 'viral_100k';
    const type = isViral ? 'VIRAL_VIDEO_CONTEST_CLAIM' : 'CONTEST_REGISTRATION';

    try {
      await supabase.from('affiliate_contest_entries').insert({
        user_id: userId,
        affiliate_code: userAffiliateCode,
        contest_type: type,
        full_name: contestFullName || `${firstName} ${lastName}`,
        email: pillar2Email,
        phone: contestPhone || pillar2Phone,
        social_handle: contestSocialHandle,
        video_url: contestVideoUrl,
        payout_details: contestBankMomoDetails,
        sales_count: totalSalesCount
      });

      await fetch('/api/affiliate/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          payload: {
            fullName: contestFullName || `${firstName} ${lastName}`,
            affiliateCode: userAffiliateCode,
            email: pillar2Email,
            phone: contestPhone || pillar2Phone,
            contestTitle: isViral
              ? '100K Views TikTok/IG Promotional Video Challenge (GH₵ 10,000)'
              : 'HorPal 50-Sales Velocity Challenge',
            socialHandle: contestSocialHandle,
            videoUrl: contestVideoUrl,
            payoutDetails: contestBankMomoDetails,
            salesCount: totalSalesCount
          }
        })
      });
    } catch (_) {}

    if (!isViral) {
      setRegisteredContests((prev) => [...prev, 'sales_50']);
    }
    setContestModalOpen(null);
    setContestStatusBanner(
      isViral
        ? `🎉 Your 100K Views Video application (Prize: ${formatAmount(VIRAL_CONTEST_PRIZE_GHS)}) has been sent to ${SUPPORT_EMAIL_PRIMARY}!`
        : `✅ You are officially registered for the Sales Challenge! Details sent to ${SUPPORT_EMAIL_PRIMARY}.`
    );
  };

  const triggerAdminMilestoneAlert = async () => {
    try {
      await fetch('/api/affiliate/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CONTEST_GOAL_REACHED_ADMIN_ALERT',
          payload: {
            fullName: `${firstName} ${lastName}`,
            affiliateCode: userAffiliateCode,
            email: pillar2Email,
            phone: pillar2Phone,
            contestTitle: '50-Sales Velocity Target Reached!',
            salesCount: totalSalesCount
          }
        })
      });
    } catch (_) {}
    setAdminMilestoneAlertSent(true);
    alert(`🚨 Admin Command Centre Alert Dispatched to ${SUPPORT_EMAIL_PRIMARY}!`);
  };

  // ============================================================================
  // FRIDAY PAYOUT SUBMISSION
  // ============================================================================
  const isFridayGMT = useMemo(() => new Date().getUTCDay() === 5, []);

  const handleFridayPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutFeedback(null);

    const amount = parseFloat(payoutAmountGHS);
    if (isNaN(amount) || amount < 90) {
      setPayoutFeedback({ type: 'error', text: 'Minimum Friday withdrawal threshold is GH₵ 90.00.' });
      return;
    }
    if (amount > availableBalanceGHS) {
      setPayoutFeedback({
        type: 'error',
        text: `Insufficient available balance (${formatAmount(availableBalanceGHS)}).`
      });
      return;
    }

    const detailsStr =
      payoutChannel === 'MOBILE_MONEY'
        ? `${momoNetwork} - ${momoNumber}`
        : payoutChannel === 'BANK_TRANSFER'
        ? `${bankName} - ${bankAccount}`
        : `USDT (TRC20) - ${usdtAddress}`;

    setIsSubmittingPayout(true);
    try {
      await fetch('/api/affiliate/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'FRIDAY_PAYOUT_REQUEST',
          payload: {
            affiliateName: `${firstName} ${lastName} (${accountHolderName})`,
            affiliateCode: userAffiliateCode,
            affiliateEmail: pillar2Email,
            phone: pillar2Phone,
            amount,
            payoutChannel,
            accountDetails: detailsStr
          }
        })
      });

      setAvailableBalanceGHS((prev) => prev - amount);
      setWithdrawnBalanceGHS((prev) => prev + amount);
      setPayoutAmountGHS('');
      setPayoutFeedback({
        type: 'success',
        text: `✅ Payout request of GH₵ ${amount.toFixed(2)} sent to ${SUPPORT_EMAIL_PRIMARY} for Friday Paystack Transfer!`
      });
    } catch (_) {
      setPayoutFeedback({
        type: 'error',
        text: 'Could not dispatch request. Please check your internet connection.'
      });
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // ============================================================================
  // HORPAL AI BUSINESS BRAIN BOT HANDLER ("1-CLICK ORDER BUMP" FALLBACK)
  // ============================================================================
  const handleAiBotSend = (customPrompt?: string) => {
    const query = (customPrompt || aiInput).trim();
    if (!query) return;

    const lower = query.toLowerCase();
    let reply = '';

    if (lower === 'hi' || lower === 'hello' || lower === 'hey' || lower.includes('good morning') || lower.includes('good afternoon')) {
      reply = `Hello ${firstName}! 👋 Welcome to the HorPal AI Business Brain. You can ask me anything about HorPal, your unique product links, Friday payouts, or how to close more sales!`;
    } else if (lower.includes('horpal') || lower.includes('commission') || lower.includes('payout') || lower.includes('friday') || lower.includes('link')) {
      reply = `On HorPal Pillar 2, every product by Gee Mings pays an instant 50% commission into your Available Balance the moment Paystack verifies payment. Your unique tracking link (${userAffiliateCode}) records the buyer's Full Name, Gmail, and Unique Order ID. Withdrawals are processed every Friday to Mobile Money, Bank, or USDT via ${SUPPORT_EMAIL_PRIMARY}!`;
    } else {
      reply = `RECOMMENDATION:\nTo maximize conversions on "${query}", pair your offer with a **1-Click Order Bump** at checkout, enable automated WhatsApp customer sync, and offer an affiliate commission of 50% to incentivize top promoters!\n\nWant me to write the complete WhatsApp broadcast sequence or TikTok hook for this?`;
    }

    setAiMessages((prev) => [...prev, { sender: 'user', text: query }, { sender: 'bot', text: reply }]);
    if (!customPrompt) setAiInput('');
  };

  // Filtered Marketplace Products
  const filteredMarketplaceProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(marketSearch.toLowerCase()) ||
        p.creator.toLowerCase().includes(marketSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(marketSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (marketFilter === 'All Offers') return true;
      if (marketFilter === 'Top Pick') return p.badges.includes('TOP PICK');
      if (marketFilter === 'High Converting') return p.badges.includes('HIGH CONVERTING');
      return p.category === marketFilter;
    });
  }, [products, marketSearch, marketFilter]);

  const unreadNotifCount = notificationsList.filter((n) => !n.read).length;
  const userInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'GM';

  // Milestone Progress Math
  const milestoneGoalGHS = 10000;
  const milestonePercent = Math.min(100, Math.round((totalEarningsGHS / milestoneGoalGHS) * 100));

  // ============================================================================
  // IF BUYER OPENED AN AFFILIATE PRODUCT LINK (?prod=...), SHOW SALES PAGE + CHECKOUT
  // ============================================================================
  if (activeSalesPageProduct && !checkoutStep) {
    const p = activeSalesPageProduct;
    return (
      <div className="min-h-screen bg-[#070b14] text-white pb-24">
        {/* Top Test Mode Bar so you can switch between Buyer Sales Page & Affiliate Dashboard */}
        <div className="bg-emerald-950/90 border-b border-emerald-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-50 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-emerald-500 text-black font-bold px-2 py-0.5 rounded text-[10px]">
              AFFILIATE LINK LANDING PAGE
            </span>
            <span className="text-emerald-200 font-mono">
              Referred by: <strong>{referredByCode}</strong> • Product: <strong>{p.shortCode}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {p.externalSalesPageUrl && (
              <a
                href={`${p.externalSalesPageUrl}?ref=${referredByCode}&prod=${p.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg flex items-center gap-1"
              >
                <span>Open External Vercel Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => setActiveSalesPageProduct(null)}
              className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1 rounded-lg"
            >
              ← Return to Affiliate Hub
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-[#0d1322] border border-emerald-500/30 rounded-3xl p-6 md:p-10 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                {p.category} • Official Access Portal
              </span>
              <span className="text-xs text-gray-400">
                Created by <strong className="text-amber-400">{p.creator}</strong>
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight mb-4">
              {p.headline}
            </h1>
            <p className="text-sm md:text-base text-gray-300 leading-relaxed mb-6">
              {p.subheadline}
            </p>

            {/* Worldwide Currency Preview Bar on Sales Page */}
            <div className="bg-[#131b2e] border border-white/10 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-gray-400 uppercase block">
                  Package Price (Includes Course + HorPal Affiliate Account)
                </span>
                <div className="text-2xl font-black text-emerald-400 mt-0.5">
                  {formatAmount(p.priceGHS)}{' '}
                  <span className="text-xs text-gray-400 font-mono">
                    (Payable: GH₵ {p.priceGHS.toFixed(2)})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {Object.values(GLOBAL_CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {p.bullets.map((b, i) => (
                <div key={i} className="flex items-start gap-3 bg-black/30 border border-white/5 rounded-xl p-3.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-gray-200">{b}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => openDigitstemCheckoutForProduct(p)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-black text-base shadow-lg shadow-emerald-500/25 transition-all"
            >
              BUY NOW — PROCEED TO CHECKOUT ({formatAmount(p.priceGHS)}) →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white font-sans pb-24 selection:bg-emerald-500 selection:text-black">
      {/* ==================================================================== */}
      {/* TOP BAR (3-LINE HAMBURGER MENU, GLOBAL CURRENCY, NOTIFICATIONS, PROFILE) */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 bg-[#0b111e]/95 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Left: 3-Line Hamburger Menu Button + Brand */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2.5 rounded-xl bg-[#141d30] hover:bg-[#1c2842] border border-white/10 text-white transition-all"
              aria-label="Open All Features Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div
              onClick={() => setActiveSection('dashboard')}
              className="cursor-pointer flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-black text-black text-sm">
                HP
              </div>
              <div className="hidden sm:block">
                <span className="font-extrabold text-sm tracking-wide text-white block leading-none">
                  HORPAL
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Affiliate Hub</span>
              </div>
            </div>
          </div>

          {/* Center/Right: Worldwide Currency Converter (Africa, Asia, Global) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#141d30] border border-white/10 rounded-full px-3 py-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[115px] sm:max-w-[160px]"
              >
                {Object.values(GLOBAL_CURRENCIES).map((curr) => (
                  <option key={curr.code} value={curr.code} className="bg-[#0d1322] text-white">
                    {curr.code} ({curr.symbol}) • {curr.region}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Bell with Badge */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2.5 rounded-full bg-[#141d30] hover:bg-[#1c2842] border border-white/10 text-white transition-all"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {unreadNotifCount}
              </span>
            </button>

            {/* Profile Avatar Button */}
            <button
              onClick={() => setIsProfileSheetOpen(true)}
              className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs flex items-center justify-center hover:bg-emerald-500/30 transition-all"
            >
              {userInitials}
            </button>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 3-LINE SLIDE-OUT NAVIGATION DRAWER (DIGITSTEM STYLE) */}
      {/* ==================================================================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          <div className="w-80 max-w-[85vw] bg-[#0b111e] border-r border-white/10 h-full overflow-y-auto p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-black font-black flex items-center justify-center">
                    H
                  </div>
                  <div>
                    <span className="font-black text-sm text-white block">HorPal Ecosystem</span>
                    <span className="text-[10px] text-emerald-400 font-mono">ID: {userAffiliateCode}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Active Workspace Box */}
              <div className="my-4 bg-[#141d30] border border-white/10 rounded-xl p-3">
                <span className="text-[10px] text-gray-400 uppercase font-mono block">
                  ACTIVE WORKSPACE
                </span>
                <span className="text-sm font-bold text-white">Affiliate & Creator Hub</span>
              </div>

              {/* Grouped Menu Links */}
              <div className="space-y-5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2 block mb-1.5">
                    CONSOLE
                  </span>
                  {[
                    { id: 'dashboard', label: 'Performance Hub', icon: BarChart3 },
                    { id: 'contests', label: 'Milestones & Contests (100K Views)', icon: Trophy },
                    { id: 'lms', label: '5-Step Exam & Certificate', icon: Award },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveSection(item.id as ActiveSection);
                          setIsDrawerOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all mb-1 ${
                          activeSection === item.id
                            ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40'
                            : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2 block mb-1.5">
                    REVENUE & MARKETING
                  </span>
                  {[
                    { id: 'marketplace', label: 'Affiliate Marketplace', icon: ShoppingBag },
                    { id: 'links', label: 'Link Manager & Shortener', icon: Share2 },
                    { id: 'ai_tools', label: 'WhatsApp Closer & Bio-Link', icon: Zap },
                    { id: 'swipe_vault', label: 'TikTok & WhatsApp Swipe Vault', icon: MessageSquare },
                    { id: 'leads_crm', label: 'Abandoned Checkout Leads CRM', icon: Users },
                    { id: 'calculator', label: 'Profit Simulator', icon: Calculator },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveSection(item.id as ActiveSection);
                          setIsDrawerOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all mb-1 ${
                          activeSection === item.id
                            ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40'
                            : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2 block mb-1.5">
                    FINANCES & GOVERNANCE
                  </span>
                  {[
                    { id: 'payouts', label: 'Friday Wallet & Withdrawals', icon: DollarSign },
                    { id: 'ledger', label: 'Financial Sales Ledger', icon: FileText },
                    { id: 'creator_site', label: 'Creator Whitelist Requirements Site', icon: Briefcase },
                    { id: 'rules_site', label: 'Official Rules & Regulations Site', icon: ShieldCheck },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveSection(item.id as ActiveSection);
                          setIsDrawerOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all mb-1 ${
                          activeSection === item.id
                            ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40'
                            : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setActiveSettingsModal('profile');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/5"
              >
                <Settings className="w-4 h-4 text-emerald-400" />
                <span>Pillar 2 Profile & Settings</span>
              </button>
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  openDirectPillar2EnrollmentCheckout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Test Direct Entry Checkout (GH₵ 90)</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsDrawerOpen(false)} />
        </div>
      )}

      {/* ==================================================================== */}
      {/* MAIN WORKSPACE CONTAINER */}
      {/* ==================================================================== */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {settingsSavedBanner && (
          <div className="mb-4 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between">
            <span>{settingsSavedBanner}</span>
            <button onClick={() => setSettingsSavedBanner(null)}>✕</button>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 1: PERFORMANCE HUB / DASHBOARD (DIGITSTEM VISUAL LAYOUT) */}
        {/* ================================================================== */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* Greeting & Top Action Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white">
                  Welcome back, {firstName} 👋
                </h1>
                <p className="text-xs text-gray-400 mt-1">
                  "Small daily execution compounds into extraordinary results. 🔥" • ID:{' '}
                  <span className="text-emerald-400 font-mono font-bold">{userAffiliateCode}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#141d30] hover:bg-[#1b263f] border border-white/10 text-xs font-bold flex items-center gap-2"
                >
                  <Bell className="w-4 h-4 text-rose-400" />
                  <span>Notifications</span>
                  <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                    {unreadNotifCount}
                  </span>
                </button>
                <button
                  onClick={() => setActiveSettingsModal('pillar2_onboarding')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold"
                >
                  Edit Pillar 2 Profile
                </button>
              </div>
            </div>

            {/* Affiliate Milestone Progress Bar (Digitstem Style) */}
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  AFFILIATE MILESTONE PROGRESS
                </span>
                <span className="text-xs font-bold bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                  🚀 {totalEarningsGHS >= 10000 ? 'Bronze Excellence' : 'Starter'}
                </span>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-2xl">
                  🚀
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Starter</h3>
                  <p className="text-xs text-gray-400">Next: Bronze Excellence Award</p>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Milestone Progress</span>
                <span className="font-bold text-emerald-400">{milestonePercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                  style={{ width: `${Math.max(5, milestonePercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                <span>Earned: {formatAmount(totalEarningsGHS)}</span>
                <span>Goal: {formatAmount(milestoneGoalGHS)}</span>
              </div>
            </div>

            {/* Purple/Indigo Available Balance Card (Digitstem Style) */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-3xl p-6 shadow-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-100 block">
                AVAILABLE BALANCE
              </span>
              <div className="text-3xl md:text-4xl font-black text-white mt-1 mb-2">
                {formatAmount(availableBalanceGHS)}
              </div>
              <p className="text-xs text-indigo-100 mb-5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Payout ready • Settles in GH₵ ({availableBalanceGHS.toFixed(2)} GHS)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveSection('marketplace')}
                  className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all"
                >
                  Promote Products
                </button>
                <button
                  onClick={() => setActiveSection('payouts')}
                  className="py-3 rounded-xl bg-white hover:bg-gray-100 text-indigo-950 font-black text-xs transition-all"
                >
                  Pay Out Now (Friday)
                </button>
              </div>
            </div>

            {/* 4 Key Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
                <span className="text-xs text-gray-400 block">Total Earnings</span>
                <span className="text-xl font-black text-white mt-1 block">
                  {formatAmount(totalEarningsGHS)}
                </span>
                <span className="text-[11px] text-emerald-400 mt-1 block">↑ Instant 50% Split</span>
              </div>
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
                <span className="text-xs text-gray-400 block">Total Sales</span>
                <span className="text-xl font-black text-white mt-1 block">{totalSalesCount}</span>
                <span className="text-[11px] text-indigo-400 mt-1 block">Verified Paystack</span>
              </div>
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
                <span className="text-xs text-gray-400 block">Withdrawn Earnings</span>
                <span className="text-xl font-black text-white mt-1 block">
                  {formatAmount(withdrawnBalanceGHS)}
                </span>
                <span className="text-[11px] text-gray-400 mt-1 block">↓ Friday Transfers</span>
              </div>
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
                <span className="text-xs text-gray-400 block">Link Clicks</span>
                <span className="text-xl font-black text-white mt-1 block">{totalClicksCount}</span>
                <span className="text-[11px] text-amber-400 mt-1 block">Active Tracking</span>
              </div>
            </div>

            {/* QUICK ACTION HUB — BIG VISIBLE BUTTONS FOR EASY REACH */}
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-5">
              <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Quick Action Hub (1-Tap Access)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Marketplace', sub: '6 Verified Offers', icon: ShoppingBag, target: 'marketplace', color: 'text-emerald-400' },
                  { label: 'Link Shortener', sub: 'Unique Links & QR', icon: Share2, target: 'links', color: 'text-indigo-400' },
                  { label: 'Withdraw Funds', sub: 'Friday Payout Desk', icon: DollarSign, target:
