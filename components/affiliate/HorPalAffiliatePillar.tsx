"use client";

import Link from 'next/link';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { authFetch } from '../../utils/authFetch';
import { hasPillar2Access, purgeLegacyAccessFlags } from '../../utils/pillarAccess';
import { toast } from 'react-hot-toast';
import { ShieldCheck,
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
, CreditCard, ArrowRight, Folder, RefreshCcw, CalendarDays, Upload, LifeBuoy, Rocket } from 'lucide-react';

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
// MARKETPLACE PRODUCTS (7 BY GERALD (CREATOR), 2 BY MOSES (PRODUCT CREATOR))
// ============================================================================
export interface MarketplaceProduct {
  epc?: string;
  conversionRate?: string;
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
  imageUrl: string;
  glowColor: string;
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

const getProductSvgFallback = (title: string, shortCode: string, accentHex = '#10b981'): string => {
  const safeTitle = title.replace(/[<>&"']/g, '');
  const safeCode = shortCode.replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#060913"/><stop offset="50%" stop-color="#0f172a"/><stop offset="100%" stop-color="#042f2e"/></linearGradient><radialGradient id="glow" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="${accentHex}" stop-opacity="0.45"/><stop offset="100%" stop-color="${accentHex}" stop-opacity="0"/></radialGradient></defs><rect width="800" height="450" fill="url(#bg)"/><rect width="800" height="450" fill="url(#glow)"/><circle cx="640" cy="110" r="120" fill="${accentHex}" fill-opacity="0.14"/><circle cx="150" cy="360" r="140" fill="#6366f1" fill-opacity="0.16"/><rect x="36" y="36" width="728" height="378" rx="24" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/><text x="56" y="96" fill="${accentHex}" font-family="monospace" font-size="22" font-weight="bold">${safeCode}</text><text x="56" y="245" fill="#ffffff" font-family="sans-serif" font-size="30" font-weight="800">${safeTitle.slice(0, 38)}</text><text x="56" y="290" fill="#94a3b8" font-family="sans-serif" font-size="18">HORPAL PILLAR 2 • 50% INSTANT COMMISSION</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const INITIAL_PRODUCTS: MarketplaceProduct[] = [
  {
    id: 'prod_faceless_ai',
    shortCode: 'FACELESS-AI',
    title: 'The AI Faceless Video Engine',
    creator: 'Gerald (Creator)',
    category: 'AI & Tech',
    badges: ['TOP PICK', 'HIGH CONVERTING', 'SALE'],
    rating: 4.9,
    epcUSD: 1.45,
    avgConvRate: '6.8%',
    refundRate: '0.2%',
    priceUSD: 15.00,
    priceGHS: 240.00,
    commissionPercent: 50,
    imageUrl: '/images/products/prod_faceless_ai.jpg',
    glowColor: 'from-cyan-500 via-blue-600 to-indigo-600',
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
        'Hey! I just got access to The AI Faceless Video Engine by Gerald. It shows you how to run profitable faceless TikTok & YouTube channels with AI. Check out the official page here: {LINK}',
        'Want to monetize short-form video without showing your face on camera? Grab The AI Faceless Video Engine here: {LINK}'
      ]
    }
  },
  {
    id: 'prod_mmm_system',
    shortCode: 'MMM-ENGINE',
    title: 'The Mega Messaging Machine (MMM)',
    creator: 'Gerald (Creator)',
    category: 'Sales',
    badges: ['TOP PICK', 'HIGH CONVERTING'],
    rating: 4.9,
    epcUSD: 1.38,
    avgConvRate: '6.4%',
    refundRate: '0.3%',
    priceUSD: 15.00,
    priceGHS: 240.00,
    commissionPercent: 50,
    imageUrl: '/images/products/prod_mmm_system.jpg',
    glowColor: 'from-emerald-500 via-teal-500 to-cyan-500',
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
        'Tired of people asking for prices and disappearing? The Mega Messaging Machine (MMM) by Gerald fixes your DM conversions immediately: {LINK}',
        'Copy-paste these exact WhatsApp closing scripts to double your daily sales: {LINK}'
      ]
    }
  },
  {
    id: 'prod_day_trading',
    shortCode: 'TRADING-ROADMAP',
    title: "Day Trading Beginner's Roadmap",
    creator: 'Moses (Product Creator)',
    category: 'Trading & Finance',
    badges: ['HIGH CONVERTING', 'SALE'],
    rating: 4.8,
    epcUSD: 1.15,
    avgConvRate: '5.9%',
    refundRate: '0.4%',
    priceUSD: 12.00,
    priceGHS: 192.00,
    commissionPercent: 50,
    imageUrl: '/images/products/prod_day_trading.jpg',
    glowColor: 'from-amber-500 via-orange-500 to-yellow-500',
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
        "If you want to learn day trading the right way without gambling your capital, study Moses' Day Trading Beginner's Roadmap: {LINK}",
        'Learn institutional chart reading, stop-loss discipline, and daily trade setups here: {LINK}'
      ]
    }
  },
  {
    id: 'prod_snapsell',
    shortCode: 'SNAPSELL-PRO',
    title: 'SnapSell: Rapid Digital Product Blueprint',
    creator: 'Gerald (Creator)',
    category: 'Sales',
    badges: ['TOP PICK', 'HIGH CONVERTING'],
    rating: 4.9,
    epcUSD: 1.62,
    avgConvRate: '7.1%',
    refundRate: '0.2%',
    priceUSD: 18.00,
    priceGHS: 288.00,
    commissionPercent: 50,
    imageUrl: '/images/products/prod_snapsell.jpg',
    glowColor: 'from-fuchsia-500 via-purple-600 to-indigo-500',
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
        'Want to launch your own digital product and keep 100% of the profit? Check out SnapSell by Gerald here: {LINK}',
        'How to build and automate a digital product funnel this weekend: {LINK}'
      ]
    }
  },
  {
    id: 'prod_status_cash',
    shortCode: 'WA-STATUS-CASH',
    title: 'WhatsApp Status Cash Machine',
    creator: 'Gerald (Creator)',
    category: 'Sales',
    badges: ['HIGH CONVERTING', 'SALE'],
    rating: 4.7,
    epcUSD: 0.98,
    avgConvRate: '8.2%',
    refundRate: '0.1%',
    priceUSD: 10.00,
    priceGHS: 160.00,
    commissionPercent: 50,
    imageUrl: '/images/products/prod_status_cash.jpg',
    glowColor: 'from-green-400 via-emerald-500 to-teal-600',
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
        'Turn your WhatsApp status viewers into paying customers every day with the WhatsApp Status Cash Machine by Gerald: {LINK}',
        'Here is how top affiliates turn 100 status views into daily commissions: {LINK}'
      ]
    }
  },
  {
    id: 'prod_ai_agency',
    shortCode: 'AI-DOLLAR-AGENCY',
    title: 'AI Freelancing & Remote Dollar Agency Blueprint',
    creator: 'Gerald (Creator)',
    category: 'AI & Tech',
    badges: ['TOP PICK', 'HIGH CONVERTING'],
    rating: 4.9,
    epcUSD: 1.85,
    avgConvRate: '6.2%',
    refundRate: '0.3%',
    priceUSD: 20.00,
    priceGHS: 320.00,
    commissionPercent: 50,
    imageUrl: '/images/products/prod_ai_agency.jpg',
    glowColor: 'from-violet-500 via-indigo-500 to-sky-500',
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
        'Ready to earn in USD from home using AI tools to fulfill client work? Check out the AI Remote Dollar Agency Blueprint by Gerald: {LINK}',
        'Step-by-step client acquisition and AI service delivery system: {LINK}'
      ]
    }
  },
  {
    id: 'prod_viral_hooks_50',
    shortCode: 'VIRAL-HOOKS-50',
    title: 'TikTok & Reels Viral Hook Vault (500+ AI Prompts)',
    creator: 'Gerald (Creator)',
    category: 'AI & Tech',
    badges: ['NEW LAUNCH', 'HIGH CONVERTING', 'GH₵ 50 OFFER'],
    rating: 4.9,
    epcUSD: 0.85,
    avgConvRate: '9.4%',
    refundRate: '0.1%',
    priceUSD: 3.15,
    priceGHS: 50.00,
    commissionPercent: 50,
    imageUrl: '/images/products/prod_viral_hooks_50.jpg',
    glowColor: 'from-rose-500 via-pink-600 to-purple-600',
    deliveryUrl: 'https://drive.google.com/drive/folders/1IhgiK8DYCM8d-a82uImfds_gS4s06D8wvs7WypmFbjE',
    headline: 'Stop The Scroll In 1.5 Seconds: 500+ Plug-And-Play Viral Hooks & AI Video Prompts',
    subheadline: 'Turn cold TikTok, Reels, and Shorts viewers into daily buyers with battle-tested hooks and AI script generators.',
    bullets: [
      '500+ pattern-interrupt hooks for Finance, AI, E-Commerce & Lifestyle',
      'Copy-paste ChatGPT & Claude script prompts for 60-second viral videos',
      'High-converting CTA scripts that drive massive bio-link clicks',
      'Instant Google Drive Vault delivery + HorPal Pillar 2 Affiliate Portal'
    ],
    swipeCopy: {
      tiktok: [
        'Why your TikTok videos get stuck at 200 views: your first 1.5 seconds! Grab 500+ Viral Hooks & AI Prompts for just GH₵ 50! #tiktokgrowth #horpal',
        'Steal these 500+ plug-and-play viral hooks and AI script prompts to turn views into daily Paystack alerts!'
      ],
      whatsapp: [
        'Want 500+ proven TikTok & Reels viral hooks + ChatGPT script prompts for just GH₵ 50? Unlock the Viral Hook Vault by Gerald here: {LINK}',
        'Stop struggling with what to post. Grab the 500+ Viral Hook Vault & earn 50% instant commission promoting it too: {LINK}'
      ]
    }
  },
  {
    id: 'prod_canva_capcut_50',
    shortCode: 'CANVA-CAPCUT-50',
    title: 'Canva & CapCut Mobile Cashflow Kit',
    creator: 'Moses (Product Creator)',
    category: 'Sales',
    badges: ['TOP PICK', 'HIGH CONVERTING', 'GH₵ 50 OFFER'],
    rating: 4.9,
    epcUSD: 0.92,
    avgConvRate: '9.8%',
    refundRate: '0.1%',
    priceUSD: 3.15,
    priceGHS: 50.00,
    commissionPercent: 50,
    imageUrl: '/images/products/prod_canva_capcut_50.jpg',
    glowColor: 'from-sky-400 via-cyan-500 to-teal-500',
    deliveryUrl: 'https://drive.google.com/drive/folders/1o7KrzMponCFxIHvCtvJtr1liyAfC-X3qKDkWrFzPWws',
    headline: 'Design High-Converting Flyers, Carousels & Short-Form Video Edits On Your Phone In 10 Minutes',
    subheadline: 'Done-for-you Canva templates, CapCut viral caption presets, and mobile client acquisition workflows.',
    bullets: [
      '100+ editable Canva flyer, status banner & social proof templates',
      'CapCut mobile retention editing, velocity cuts & auto-caption mastery',
      'Blueprint to charge local brands GH₵ 300–GH₵ 1,000 weekly for mobile creatives',
      'Instant Google Drive Vault delivery + HorPal Pillar 2 Affiliate Portal'
    ],
    swipeCopy: {
      tiktok: [
        'Make GH₵ 300 to GH₵ 1,000 weekly designing flyers and CapCut reels from your phone! Full Kit is only GH₵ 50! #canvatips #capcutedit',
        '100+ editable Canva flyers & CapCut viral presets ready to copy on your phone today!'
      ],
      whatsapp: [
        'Hey! Check out the Canva & CapCut Mobile Cashflow Kit by Moses — 100+ ready-made templates and mobile editing workflows for just GH₵ 50: {LINK}',
        'Turn your smartphone into a creative cashflow studio in 10 minutes. Grab the Canva & CapCut Kit here: {LINK}'
      ]
    }
  },
  {
    id: 'prod_ai_ecommerce_100',
    shortCode: 'ECOM-AI-100',
    title: 'AI E-Commerce & Mini-Importation Empire Blueprint',
    creator: 'Gerald (Creator)',
    category: 'Trading & Finance',
    badges: ['TOP PICK', 'HIGH CONVERTING', 'BEST VALUE'],
    rating: 5.0,
    epcUSD: 1.28,
    avgConvRate: '8.6%',
    refundRate: '0.2%',
    priceUSD: 6.25,
    priceGHS: 100.00,
    commissionPercent: 50,
    imageUrl: '/images/products/prod_ai_ecommerce_100.jpg',
    glowColor: 'from-yellow-400 via-amber-500 to-emerald-500',
    deliveryUrl: 'https://drive.google.com/drive/folders/1zbDb8kAk-0Tf_SVX2vQUiUDm6NrW_LN33dOv7mLdqzA',
    headline: 'Source Winning Physical & Digital Products And Sell Out Daily Using AI Ads & WhatsApp Funnels',
    subheadline: 'The complete A-to-Z blueprint for launching a profitable mini-importation and social commerce brand.',
    bullets: [
      'Verified factory & supplier sourcing + landed-cost calculator',
      'AI product photography & high-converting video ads without studio shoots',
      'Prepaid & WhatsApp automated closing funnel that eliminates fake orders',
      'Instant Google Drive Vault delivery + HorPal Pillar 2 Affiliate Portal'
    ],
    swipeCopy: {
      tiktok: [
        'How mini-importers are using AI product ads and WhatsApp funnels to sell out inventory daily without a studio! #miniimportation #ecommerceafrica',
        'Source winning products from verified factories and launch your AI E-Commerce brand today for GH₵ 100!'
      ],
      whatsapp: [
        'Ready to start a profitable mini-importation & AI e-commerce brand without fake orders? Grab Gerald’s AI E-Commerce Empire Blueprint here: {LINK}',
        'Learn verified supplier sourcing, landed-cost math, and AI video ads for GH₵ 100 (and earn GH₵ 50 per referral!): {LINK}'
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
      { q: 'Who is the official Founder & primary creator of the core digital products in the HorPal Marketplace?', options: ['Gerald (Creator)', 'Anonymous Vendor', 'External Broker', 'Random User'], correctIndex: 0 },
      { q: 'If a buyer purchases a product through your unique affiliate link, what do they receive?', options: ['Only the affiliate dashboard', 'Both the Digital Product access AND unlocked HorPal Pillar 2 Affiliate access', 'Nothing until next month', 'Only a receipt'], correctIndex: 1 },
      { q: 'If a user pays the GH₵ 90 direct registration fee without buying a product through an affiliate product link, what do they unlock?', options: ['All 9 products for free', 'The HorPal Pillar 2 Affiliate Portal only (no product included)', 'Only Pillar 1 social chat', 'A physical book'], correctIndex: 1 },
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
      { q: 'How does the HorPal Bio-Link / LinkHub help you promote multiple products at once?', options: ['It creates a single personal storefront URL displaying all 9 products with your affiliate code attached', 'It deletes your links', 'It only works offline', 'It blocks mobile users'], correctIndex: 0 },
      { q: 'Where can you update your Pillar 2 First Name, Last Name, Phone Number, Address, and KYC ID?', options: ['Inside the Profile & Details / Account Information (KYC) modal from the top-right Profile button', 'You can never change it', 'Only by creating a new Gmail', 'Nowhere'], correctIndex: 0 },
      { q: 'Before claiming the GH₵ 10,000 TikTok/Instagram 100K Views Prize, what details must you submit in the Contest Portal?', options: ['Only your first name', 'Your TikTok/IG handle, public video link showing 100k+ views, full name, phone, and Bank/MoMo payout details', 'A screenshot of someone else’s account', 'Nothing'], correctIndex: 1 },
      { q: 'Why is combining Short-Form Video (TikTok/Reels) + WhatsApp Closing the highest-converting affiliate strategy?', options: ['Short-form video brings free daily traffic while WhatsApp Status & DMs build trust and close the sale', 'Because it requires $10,000 in ad spend', 'It is not effective', 'Only works in one city'], correctIndex: 0 },
      { q: 'Upon passing all 5 steps of this examination with 90%+ accuracy, what do you earn?', options: ['An Official Personalized HorPal Certificate of Completion with a unique verification ID', 'Nothing', 'A penalty', 'Account suspension'], correctIndex: 0 },
    ]
  }
};

// ============================================================================
// PAYSTACK INSTANT TRANSFER CORRIDOR PROVIDERS (GHANA, NIGERIA, KENYA, SA, CIV)
// ============================================================================
const PAYSTACK_CORRIDOR_PROVIDERS: Record<
  string,
  {
    MOBILE_MONEY: Array<{ code: string; name: string }>;
    LOCAL_BANK: Array<{ code: string; name: string }>;
  }
> = {
  'Ghana (GHS)': {
    MOBILE_MONEY: [
      { code: 'MTN', name: 'MTN Mobile Money (MTN)' },
      { code: 'VOD', name: 'Telecel / Vodafone Cash (VOD)' },
      { code: 'ATL', name: 'AirtelTigo Money (ATL)' },
    ],
    LOCAL_BANK: [
      { code: 'GCB', name: 'GCB Bank (GCB)' },
      { code: 'Ecobank', name: 'Ecobank Ghana (Ecobank)' },
      { code: 'Fidelity', name: 'Fidelity Bank Ghana (Fidelity)' },
      { code: 'Stanbic', name: 'Stanbic Bank Ghana (Stanbic)' },
      { code: 'Zenith', name: 'Zenith Bank Ghana (Zenith)' },
      { code: 'Absa', name: 'Absa Bank Ghana (Absa)' },
      { code: 'CalBank', name: 'CalBank Ghana' },
      { code: 'UBA-GH', name: 'UBA Ghana' },
    ],
  },
  'Nigeria (NGN)': {
    MOBILE_MONEY: [
      { code: '999992', name: 'OPay Digital Services (999992)' },
      { code: '999991', name: 'PalmPay (999991)' },
      { code: '50515', name: 'Moniepoint MFB (50515)' },
      { code: '50211', name: 'Kuda Bank (50211)' },
    ],
    LOCAL_BANK: [
      { code: '058', name: 'Guaranty Trust Bank - GTBank (058)' },
      { code: '057', name: 'Zenith Bank (057)' },
      { code: '044', name: 'Access Bank (044)' },
      { code: '033', name: 'United Bank for Africa - UBA (033)' },
      { code: '011', name: 'First Bank of Nigeria (011)' },
      { code: '214', name: 'First City Monument Bank - FCMB (214)' },
      { code: '070', name: 'Fidelity Bank Nigeria (070)' },
      { code: '232', name: 'Sterling Bank (232)' },
    ],
  },
  'Kenya (KES)': {
    MOBILE_MONEY: [
      { code: 'MPESA', name: 'M-PESA Safaricom (MPESA)' },
      { code: 'AIRTEL-KE', name: 'Airtel Money Kenya (AIRTEL-KE)' },
    ],
    LOCAL_BANK: [
      { code: '01', name: 'Kenya Commercial Bank - KCB (01)' },
      { code: '68', name: 'Equity Bank Kenya (68)' },
      { code: '11', name: 'Co-operative Bank of Kenya (11)' },
      { code: '03', name: 'Absa Bank Kenya (03)' },
      { code: '31', name: 'Stanbic Bank Kenya (31)' },
      { code: '07', name: 'NCBA Bank Kenya (07)' },
    ],
  },
  'South Africa (ZAR)': {
    MOBILE_MONEY: [
      { code: 'TYME', name: 'TymeBank Mobile Wallet (678910)' },
      { code: 'CAPITEC-PAY', name: 'Capitec Pay Mobile (470010)' },
    ],
    LOCAL_BANK: [
      { code: '470010', name: 'Capitec Bank (470010)' },
      { code: '250655', name: 'First National Bank - FNB (250655)' },
      { code: '051001', name: 'Standard Bank South Africa (051001)' },
      { code: '632005', name: 'Absa Bank South Africa (632005)' },
      { code: '198765', name: 'Nedbank (198765)' },
      { code: '678910', name: 'TymeBank (678910)' },
    ],
  },
  "Côte d'Ivoire (XOF)": {
    MOBILE_MONEY: [
      { code: 'WAVE-CI', name: "Wave Mobile Money Côte d'Ivoire (WAVE-CI)" },
      { code: 'OM-CI', name: "Orange Money Côte d'Ivoire (OM-CI)" },
      { code: 'MTN-CI', name: "MTN MoMo Côte d'Ivoire (MTN-CI)" },
      { code: 'MOOV-CI', name: "Moov Money Côte d'Ivoire (MOOV-CI)" },
    ],
    LOCAL_BANK: [
      { code: 'SGCI', name: "Société Générale Côte d'Ivoire (SGCI)" },
      { code: 'ECO-CI', name: "Ecobank Côte d'Ivoire (ECO-CI)" },
      { code: 'NSIA-CI', name: 'NSIA Banque (NSIA-CI)' },
      { code: 'BACI', name: 'Banque Atlantique (BACI)' },
    ],
  },
};

const GLOBAL_COUNTRY_LIST = [
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'France',
  'Netherlands',
  'Italy',
  'Spain',
  'Switzerland',
  'Sweden',
  'Ireland',
  'United Arab Emirates',
  'India',
  'China',
  'Singapore',
  'Malaysia',
  'Philippines',
  'Japan',
  'Australia',
  'Brazil',
  'Cameroon',
  'Senegal',
  'Uganda',
  'Tanzania',
  'Rwanda',
  'Zambia',
  'Sierra Leone',
  'Gambia',
  'Egypt',
  'Morocco',
  'Ethiopia',
  'Botswana',
  'Namibia',
  'Ghana',
  'Nigeria',
  'Kenya',
  'South Africa',
  "Côte d'Ivoire",
  'Other International Country',
];

const buildDeterministicAffiliateCode = (uid?: string | null): string => {
  if (!uid) return '';
  const cleaned = uid.replace(/-/g, '').substring(0, 6).toUpperCase();
  return cleaned ? `HP-${cleaned}` : '';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function HorPalAffiliatePillar({
  currentProfile,
  onRefreshProfile,
  initialSection = 'dashboard',
  defaultFullScreenPayoutPortal = false,
}: {
  currentProfile?: any;
  onRefreshProfile?: () => void;
  initialSection?:
    | 'dashboard'
    | 'marketplace'
    | 'links'
    | 'exam'
    | 'contests'
    | 'payouts'
    | 'ledger'
    | 'vault'
    | 'ai_tools'
    | 'leads_crm'
    | 'calculator'
    | 'creator'
    | 'rules'
    | 'profile'
    | 'notifications'
    | 'support'
    | 'my_courses';
  defaultFullScreenPayoutPortal?: boolean;
}) {
  // Primary Workspace Navigation (Digitstem Top Drawer + Scrollable Bottom Bar)
  type ActiveSection =
    | 'dashboard'
    | 'marketplace'
    | 'links'
    | 'exam'
    | 'contests'
    | 'payouts'
    | 'ledger'
    | 'vault'
    | 'ai_tools'
    | 'leads_crm'
    | 'calculator'
    | 'creator'
    | 'rules'
    | 'profile'
    | 'notifications'
    | 'support'
    | 'my_courses';

  const [activeSection, setActiveSection] = useState<ActiveSection>(initialSection);
  const [isFullScreenPayoutPortal, setIsFullScreenPayoutPortal] = useState<boolean>(defaultFullScreenPayoutPortal);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GHS');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState<boolean>(false);
  const [activeSettingsModal, setActiveSettingsModal] = useState<
    null | 'profile' | 'kyc' | 'notifications' | 'security' | '2fa' | 'support' | 'pillar2_onboarding'
  >(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isAiBotOpen, setIsAiBotOpen] = useState<boolean>(false);
  const [isLockedDashboardModalOpen, setIsLockedDashboardModalOpen] = useState<boolean>(false);
  const [passedCourseCertificates, setPassedCourseCertificates] = useState<Record<string, string>>({});

  // User & Separate Pillar 2 Profile State (Strictly Isolated — Zero Hardcoded Fallbacks)
  const initialUid = currentProfile?.id || null;
  const initialIsGoogle = Boolean(currentProfile?.app_metadata?.provider === 'google');
  const initialProfileCompleted = Boolean(currentProfile?.profile_completed);
  const initialRawFullName = (
    currentProfile?.pillar2_full_name ||
    currentProfile?.full_name ||
    currentProfile?.name ||
    ''
  ).trim();
  const initialNameParts = initialRawFullName.split(/\s+/).filter(Boolean);
  const [userId, setUserId] = useState<string | null>(initialUid);
  const [isGoogleAuthUser, setIsGoogleAuthUser] = useState<boolean>(initialIsGoogle);
  const [profileCompleted, setProfileCompleted] = useState<boolean>(initialProfileCompleted);
  const [isMandatoryProfileCompletion, setIsMandatoryProfileCompletion] = useState<boolean>(false);
  const [profileValidationError, setProfileValidationError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(
    initialIsGoogle && !initialProfileCompleted
      ? ''
      : (currentProfile?.username || '').replace(/^@+/, '').trim()
  );
  const [userAffiliateCode, setUserAffiliateCode] = useState<string>(
    currentProfile?.affiliate_code && !currentProfile.affiliate_code.endsWith('-TEST')
      ? currentProfile.affiliate_code
      : buildDeterministicAffiliateCode(initialUid)
  );
  const [firstName, setFirstName] = useState<string>(
    initialIsGoogle && !initialProfileCompleted
      ? currentProfile?.pillar2_first_name || ''
      : currentProfile?.pillar2_first_name ||
          currentProfile?.first_name ||
          initialNameParts[0] ||
          ''
  );
  const [lastName, setLastName] = useState<string>(
    initialIsGoogle && !initialProfileCompleted
      ? currentProfile?.pillar2_last_name || ''
      : currentProfile?.pillar2_last_name ||
          currentProfile?.last_name ||
          initialNameParts.slice(1).join(' ') ||
          ''
  );
  const [pillar2Email, setPillar2Email] = useState<string>(
    currentProfile?.email || currentProfile?.pillar2_email || ''
  );
  const [pillar2DialCode, setPillar2DialCode] = useState<string>('+233');
  const [pillar2Phone, setPillar2Phone] = useState<string>(
    currentProfile?.pillar2_phone ||
      currentProfile?.phone_number ||
      currentProfile?.phone ||
      ''
  );
  const [pillar2Country, setPillar2Country] = useState<string>(
    currentProfile?.pillar2_country ||
      currentProfile?.country ||
      currentProfile?.location_country ||
      (initialIsGoogle && !initialProfileCompleted ? '' : 'Ghana')
  );
  const [pillar2State, setPillar2State] = useState<string>('');
  const [pillar2City, setPillar2City] = useState<string>(currentProfile?.pillar2_city || '');
  const [pillar2Zip, setPillar2Zip] = useState<string>('');
  const [pillar2Address, setPillar2Address] = useState<string>(currentProfile?.pillar2_address || '');
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(true);
  const [kycIdType, setKycIdType] = useState<string>('Ghana Card / National ID');
  const [kycIdNumber, setKycIdNumber] = useState<string>('');
  const [kycVerified, setKycVerified] = useState<boolean>(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [settingsSavedBanner, setSettingsSavedBanner] = useState<string | null>(null);
  const [downloadSuccessBanner, setDownloadSuccessBanner] = useState<string | null>(null);

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
  const [unlockedProductIds, setUnlockedProductIds] = useState<string[]>([]);
  const [totalClicksCount, setTotalClicksCount] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Native Paystack Deposit Modal State (No In-App 6-Digit Code)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [depositAmountGHS, setDepositAmountGHS] = useState<string>('');
  const [depositMethod, setDepositMethod] = useState<string>('PAYSTACK');
  const [isVerifyingDeposit, setIsVerifyingDeposit] = useState<boolean>(false);
  const [walletHistory, setWalletHistory] = useState<
    Array<{
      id: string;
      reference: string;
      type: string;
      amountGHS: number;
      date: string;
      status: string;
    }>
  >([]);

  // 1-Year License Timer State — Strictly derived from live verified Supabase profile
  const initialHasLicense = hasPillar2Access(currentProfile);
  const rawExpiresIso =
    currentProfile?.pillar2_expires_at || currentProfile?.license_expires_at || null;
  const rawPaidAtIso =
    currentProfile?.pillar2_paid_at || currentProfile?.license_activated_at || null;
  const initialActivatedMs = rawPaidAtIso ? new Date(rawPaidAtIso).getTime() : Date.now();
  const parsedExpiresMs = rawExpiresIso ? new Date(rawExpiresIso).getTime() : 0;
  const fallbackYearMs = Date.now() + 365 * 24 * 60 * 60 * 1000;
  const initialExpiresMs =
    parsedExpiresMs > Date.now()
      ? parsedExpiresMs
      : initialHasLicense
      ? fallbackYearMs
      : 0;
  const initialDiffMs = initialHasLicense
    ? Math.max(0, initialExpiresMs - Date.now())
    : 365 * 24 * 60 * 60 * 1000 - 1000;
  const [hasActivePaidLicense, setHasActivePaidLicense] = useState<boolean>(initialHasLicense);
  const [licenseActivatedAt, setLicenseActivatedAt] = useState<number>(
    initialHasLicense ? initialActivatedMs : 0
  );
  const [licenseExpiresAt, setLicenseExpiresAt] = useState<number>(initialExpiresMs);
  const [timeRemaining, setTimeRemaining] = useState({
    days: Math.floor(initialDiffMs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((initialDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((initialDiffMs % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((initialDiffMs % (1000 * 60)) / 1000),
    expired: false,
  });
  const expiryAlertSentRef = useRef<boolean>(false);
  const hasSyncedMissingExpiryRef = useRef<boolean>(false);

  // Renewal Gate State (Strictly hidden while NOW() < pillar2_expires_at)
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState<boolean>(false);

  // Marketplace Search, Filter & Modals
  const [products, setProducts] = useState<MarketplaceProduct[]>(INITIAL_PRODUCTS);
  const [freezeP2Withdrawals, setFreezeP2Withdrawals] = useState<boolean>(false);

  // Phase 6 & Phase 2: Live sync Pillar 2 Marketplace products from public.pillar2_products + freeze_p2_withdrawals
  useEffect(() => {
    let isMounted = true;

    const mapDbProductToMarketplace = (row: any): MarketplaceProduct => {
      const existing = INITIAL_PRODUCTS.find(
        (p) =>
          p.id === row.id ||
          p.title.toLowerCase() === String(row.title || '').toLowerCase()
      );
      const priceGHS = Number(row.price_ghs ?? existing?.priceGHS ?? 150);
      const priceUSD = Number((priceGHS / 16).toFixed(2));
      const commissionPercent = Math.round(Number(row.commission_rate ?? 0.5) * 100);
      const creatorRaw = String(row.creator_name || existing?.creator || 'Gerald');
      const creatorLabel = creatorRaw.includes('(')
        ? creatorRaw
        : creatorRaw.toLowerCase().includes('moses')
        ? `${creatorRaw} (Product Creator)`
        : `${creatorRaw} (Creator)`;

      const shortCode =
        existing?.shortCode ||
        String(row.id || row.title || 'OFFER')
          .replace(/^prod_/, '')
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-')
          .slice(0, 14);

      const bulletsArray =
        Array.isArray(row.features) && row.features.length > 0
          ? row.features.map((f: any) => String(f))
          : existing?.bullets || [
              'Instant access to complete training & implementation templates',
              '50% Instant Affiliate Commission enabled for Pillar 2 partners',
              'Direct Google Drive Vault delivery immediately after checkout',
              'Lifetime updates & mobile-friendly execution blueprint',
            ];

      return {
        ...(existing || {}),
        id: String(row.id),
        shortCode,
        title: String(row.title || existing?.title || 'Digital Mastery Program'),
        creator: creatorLabel,
        category: String(row.category || existing?.category || 'Digital Mastery'),
        badges: existing?.badges || ['TOP PICK', 'HIGH CONVERTING', '50% SPLIT'],
        rating: existing?.rating || 4.9,
        epcUSD: existing?.epcUSD || 1.4,
        avgConvRate: existing?.avgConvRate || '6.5%',
        refundRate: existing?.refundRate || '0.2%',
        priceUSD,
        priceGHS,
        commissionPercent,
        imageUrl:
          row.cover_image_url ||
          existing?.imageUrl ||
          getProductSvgFallback(String(row.title || 'Course'), shortCode),
        glowColor: existing?.glowColor || 'from-emerald-500 via-teal-500 to-cyan-500',
        externalSalesPageUrl: existing?.externalSalesPageUrl,
        deliveryUrl: String(
          row.drive_delivery_url ||
            existing?.deliveryUrl ||
            'https://drive.google.com'
        ),
        headline: String(
          row.subtitle ||
            existing?.headline ||
            row.title ||
            'Complete Step-by-Step Digital Mastery Blueprint'
        ),
        subheadline: String(
          row.description ||
            existing?.subheadline ||
            'Master this complete blueprint with instant Google Drive delivery.'
        ),
        bullets: bulletsArray,
        swipeCopy: existing?.swipeCopy || {
          tiktok: [
            `Just unlocked ${row.title}! Step-by-step blueprint with instant access. Link in bio!`,
          ],
          whatsapp: [
            `Hey! Check out ${row.title} by ${creatorRaw}. Grab instant access here: {LINK}`,
          ],
        },
      };
    };

    const syncMarketplaceProducts = async () => {
      try {
        const res = await fetch(`/api/admin/products?_t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data?.products) && data.products.length > 0) {
          setProducts(data.products.map(mapDbProductToMarketplace));
        }
      } catch {
        // fallback to INITIAL_PRODUCTS
      }
    };

    const syncPlatformSettings = async () => {
      try {
        const res = await fetch(`/api/admin/action?_t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data?.settings) {
          setFreezeP2Withdrawals(Boolean(data.settings.freeze_p2_withdrawals));
        }
      } catch {}
    };

    void syncMarketplaceProducts();
    void syncPlatformSettings();

    const onSettingsEvent = (e: any) => {
      if (e?.detail) {
        setFreezeP2Withdrawals(Boolean(e.detail.freeze_p2_withdrawals));
      }
    };
    const onProductsUpdatedEvent = () => {
      void syncMarketplaceProducts();
    };
    window.addEventListener('earnmega:platform-settings-updated', onSettingsEvent);
    window.addEventListener('earnmega:products-updated', onProductsUpdatedEvent);

    let prodChannel: any = null;
    try {
      const prodChannelName =
        'pillar2_products_live_sync_' + Math.random().toString(36).substring(2, 9);
      prodChannel = supabase
        .channel(prodChannelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pillar2_products' },
          () => void syncMarketplaceProducts()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'platform_settings' },
          (payload: any) => {
            if (payload?.new) {
              setFreezeP2Withdrawals(Boolean(payload.new.freeze_p2_withdrawals));
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime fallback to polling:', err);
    }

    let cmdChannel: any = null;
    try {
      const cmdChannelName =
        'horpal_godmode_command_p2_' + Math.random().toString(36).substring(2, 9);
      cmdChannel = supabase
        .channel(cmdChannelName)
        .on('broadcast', { event: 'PRODUCTS_UPDATED' }, () => void syncMarketplaceProducts())
        .on('broadcast', { event: 'PLATFORM_SETTINGS_UPDATED' }, (payload: any) => {
          if (payload?.payload) {
            setFreezeP2Withdrawals(Boolean(payload.payload.freeze_p2_withdrawals));
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('Realtime fallback to polling:', err);
    }

    return () => {
      isMounted = false;
      window.removeEventListener('earnmega:platform-settings-updated', onSettingsEvent);
      window.removeEventListener('earnmega:products-updated', onProductsUpdatedEvent);
      if (prodChannel) supabase.removeChannel(prodChannel);
      if (cmdChannel) supabase.removeChannel(cmdChannel);
    };
  }, []);
  const [linkTags, setLinkTags] = useState<Record<string, string>>({});
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
  const [attributedRefCode, setAttributedRefCode] = useState<string>('');
  const referredByCode = attributedRefCode;
  const setReferredByCode = setAttributedRefCode;
  const [checkoutStep, setCheckoutStep] = useState<null | 1 | 2>(null);
  const [buyerFullName, setBuyerFullName] = useState<string>('');
  const [buyerCountry, setBuyerCountry] = useState<string>('Ghana');
  const [buyerDialCode, setBuyerDialCode] = useState<string>('+233');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [checkoutGatewayCurrency, setCheckoutGatewayCurrency] = useState<string>('GHS');
  const [includeOrderBump, setIncludeOrderBump] = useState<boolean>(false);

  // Financial Sales Ledger (Strictly Affiliate Product Sales — Separated from Wallet Deposits)
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
  >([]);

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
  const [certificateStudentName, setCertificateStudentName] = useState<string>('');
  const [certificateCode, setCertificateCode] = useState<string>('');

  // Contests & 100K Views TikTok/IG Challenge + Live Payout Requests State
  const [registeredContests, setRegisteredContests] = useState<string[]>([]);
  const [contestModalOpen, setContestModalOpen] = useState<null | 'viral_100k' | 'sales_50' | 'sales_100' | 'weekly_top3'>(null);
  const [contestFullName, setContestFullName] = useState<string>('');
  const [contestPhone, setContestPhone] = useState<string>('');
  const [contestSocialHandle, setContestSocialHandle] = useState<string>('');
  const [contestVideoUrl, setContestVideoUrl] = useState<string>('');
  const [contestBankMomoDetails, setContestBankMomoDetails] = useState<string>('');
  const [contestStatusBanner, setContestStatusBanner] = useState<string | null>(null);
  const [adminMilestoneAlertSent, setAdminMilestoneAlertSent] = useState<boolean>(false);
  const [isSubmittingContest, setIsSubmittingContest] = useState<boolean>(false);
  const [expandedContestRules, setExpandedContestRules] = useState<Record<string, boolean>>({});
  const [contestSubmissions, setContestSubmissions] = useState<Array<{
    id: string;
    user_id?: string | null;
    affiliate_code?: string | null;
    full_name: string;
    email: string;
    phone?: string | null;
    contest_id: string;
    contest_title: string;
    video_or_proof_url?: string | null;
    platform_handle?: string | null;
    verified_sales_count: number;
    notes?: string | null;
    status: 'pending_review' | 'processing' | 'approved_winner' | 'rejected';
    admin_note?: string | null;
    created_at: string;
  }>>([]);
  const [contestParticipantCounts, setContestParticipantCounts] = useState<Record<string, number>>({
    viral_100k: 0,
    sales_50: 0,
    sales_100: 0,
    weekly_top3: 0,
  });
  const [weeklySalesCount, setWeeklySalesCount] = useState<number>(0);
  const [payoutRequests, setPayoutRequests] = useState<Array<{
    id: string;
    user_id?: string | null;
    affiliate_code?: string | null;
    affiliate_name: string;
    affiliate_email: string;
    affiliate_phone?: string | null;
    amount_ghs: number;
    payout_method: string;
    account_name: string;
    account_number: string;
    bank_or_network?: string | null;
    balance_before_ghs?: number | null;
    balance_after_ghs?: number | null;
    status: 'pending' | 'processing' | 'paid' | 'rejected';
    admin_status_note?: string | null;
    processed_at?: string | null;
    created_at: string;
  }>>([]);

  // ============================================================================
  // DUAL-CORRIDOR FRIDAY PAYOUT DESK & GLOBAL MANUAL SETTLEMENT STATE
  // ============================================================================
  const [payoutCorridor, setPayoutCorridor] = useState<'PAYSTACK_AUTO' | 'GLOBAL_MANUAL'>('PAYSTACK_AUTO');
  const [payoutAmountGHS, setPayoutAmountGHS] = useState<string>('');
  const [payoutFeedback, setPayoutFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState<boolean>(false);

  // Tab A: Instant Paystack Transfer (Supported Countries)
  const [paystackEligibleCountry, setPaystackEligibleCountry] = useState<string>('Ghana (GHS)');
  const [paystackSettlementMethod, setPaystackSettlementMethod] = useState<'MOBILE_MONEY' | 'LOCAL_BANK'>('MOBILE_MONEY');
  const [paystackBankCode, setPaystackBankCode] = useState<string>('MTN');
  const [paystackAccountNumber, setPaystackAccountNumber] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [isResolvingAccount, setIsResolvingAccount] = useState<boolean>(false);
  const [accountResolvedBadge, setAccountResolvedBadge] = useState<string | null>(null);
  const [accountResolveError, setAccountResolveError] = useState<string | null>(null);

  // Tab B: Global Manual Settlement Portal (All Other Countries)
  const [globalBeneficiaryName, setGlobalBeneficiaryName] = useState<string>('');
  const [globalResidenceCountry, setGlobalResidenceCountry] = useState<string>('United States');
  const [globalCityStatePostal, setGlobalCityStatePostal] = useState<string>('');
  const [globalWhatsappDialCode, setGlobalWhatsappDialCode] = useState<string>('+1');
  const [globalWhatsappPhone, setGlobalWhatsappPhone] = useState<string>('');
  const [globalVerifiedEmail, setGlobalVerifiedEmail] = useState<string>('');
  const [globalSettlementRail, setGlobalSettlementRail] = useState<'BANK_WIRE' | 'CRYPTO_USDT' | 'REGIONAL_WALLET'>('BANK_WIRE');

  // Dynamic Rail 1: International Bank Wire (SWIFT / IBAN / ACH)
  const [globalBankName, setGlobalBankName] = useState<string>('');
  const [globalBankBranchAddress, setGlobalBankBranchAddress] = useState<string>('');
  const [globalIbanOrAccount, setGlobalIbanOrAccount] = useState<string>('');
  const [globalSwiftBic, setGlobalSwiftBic] = useState<string>('');
  const [globalRoutingSortCode, setGlobalRoutingSortCode] = useState<string>('');
  const [globalAccountCurrency, setGlobalAccountCurrency] = useState<string>('USD');

  // Dynamic Rail 2: USDT Crypto (TRC20 / BEP20)
  const [globalCryptoNetwork, setGlobalCryptoNetwork] = useState<'USDT-TRC20' | 'USDT-BEP20'>('USDT-TRC20');
  const [globalCryptoAddress, setGlobalCryptoAddress] = useState<string>('');

  // Dynamic Rail 3: Regional Wallet / Wise / PayPal
  const [globalWalletProvider, setGlobalWalletProvider] = useState<string>('Wise');
  const [globalWalletAccountTag, setGlobalWalletAccountTag] = useState<string>('');
  const [globalWalletCurrency, setGlobalWalletCurrency] = useState<string>('USD');

  // Compliance Confirmation Checkbox
  const [globalComplianceConfirmed, setGlobalComplianceConfirmed] = useState<boolean>(false);

  // Legacy aliases kept for compatibility
  const [payoutChannel, setPayoutChannel] = useState<'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CRYPTO_USDT'>('MOBILE_MONEY');
  const [momoNetwork, setMomoNetwork] = useState<string>('MTN');
  const [momoNumber, setMomoNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('GCB Bank');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [usdtAddress, setUsdtAddress] = useState<string>('');

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
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([]);

  // Extra Feature: WhatsApp Auto-Closer, Social Proof Flyer & Bio-Link Storefront Preview
  const [waCloserNumber, setWaCloserNumber] = useState<string>('');
  const [waCloserProduct, setWaCloserProduct] = useState<string>(INITIAL_PRODUCTS[0].id);
  const [waCloserCustomPitch, setWaCloserCustomPitch] = useState<string>('');
  const [showBioLinkPreview, setShowBioLinkPreview] = useState<boolean>(false);
  const [flyerPreviewUrl, setFlyerPreviewUrl] = useState<string | null>(null);

  // ============================================================================
  // DESTROY CONTAMINATED GLOBAL CACHE ON MOUNT
  // ============================================================================
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('horpal_p2_state_v3');
      } catch (_) {}
    }
  }, []);

  // ============================================================================
  // INITIALIZE URL PARAMS (SALES PAGE LANDING & 30-DAY ATTRIBUTION) & SUPABASE DATA
  // ============================================================================
  useEffect(() => {
    let hasProdLanding = false;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const prodParam =
        params.get('prod') ||
        params.get('product') ||
        sessionStorage.getItem('horpal_active_prod');
      const refParam = params.get('ref') || params.get('aff');
      const storeParam = params.get('store');
      const sectionParam = params.get('section');
      const portalParam = params.get('portal');
      const paystackCallbackRef = params.get('reference') || params.get('trxref');

      if (sectionParam === 'payouts' || portalParam === 'payout') {
        setActiveSection('payouts');
        if (portalParam === 'payout') {
          setIsFullScreenPayoutPortal(true);
        }
      }

      if (refParam) {
        const cleanRef = refParam.trim();
        try {
          sessionStorage.setItem('horpal_active_ref', cleanRef);
          localStorage.setItem(
            'horpal_last_ref_attribution',
            JSON.stringify({
              code: cleanRef,
              expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
            })
          );
          localStorage.setItem('horpal_affiliate_ref', cleanRef);

          const clickKey = `horpal_clicked_${cleanRef.toUpperCase()}`;
          if (!sessionStorage.getItem(clickKey)) {
            sessionStorage.setItem(clickKey, '1');
            supabase.rpc('increment_pillar2_click_rpc', {
              p_affiliate_code: cleanRef,
            }).then(() => {});
          }
        } catch (_) {}
        setAttributedRefCode(cleanRef);
      } else {
        try {
          let resolvedRef = sessionStorage.getItem('horpal_active_ref') || '';
          if (!resolvedRef) {
            const rawAttr = localStorage.getItem('horpal_last_ref_attribution');
            if (rawAttr) {
              const parsed = JSON.parse(rawAttr);
              if (parsed?.code && parsed?.expiresAt && Number(parsed.expiresAt) > Date.now()) {
                resolvedRef = String(parsed.code);
              } else {
                localStorage.removeItem('horpal_last_ref_attribution');
              }
            }
          }
          if (!resolvedRef) {
            resolvedRef = localStorage.getItem('horpal_affiliate_ref') || '';
          }
          if (resolvedRef) setAttributedRefCode(resolvedRef);
        } catch (_) {}
      }

      // CRITICAL: When someone opens a unique product affiliate link (?prod=... or ?product=...),
      // land them directly on that product's high-converting Sales Page & Checkout!
      if (prodParam) {
        const matched = products.find(
          (p) =>
            p.id === prodParam ||
            p.id.toLowerCase() === prodParam.toLowerCase() ||
            p.shortCode.toLowerCase() === prodParam.toLowerCase()
        );
        if (matched) {
          hasProdLanding = true;
          setActiveSalesPageProduct(matched);
          try {
            sessionStorage.removeItem('horpal_active_prod');
          } catch (_) {}
        }
      }

      if (paystackCallbackRef && !paystackCallbackRef.toUpperCase().startsWith('HP_TEST_')) {
        try {
          const pendingRaw = sessionStorage.getItem('horpal_pending_p2_product_purchase');
          if (pendingRaw) {
            sessionStorage.removeItem('horpal_pending_p2_product_purchase');
            const pendingData = JSON.parse(pendingRaw);
            const cleanedUrl = new URL(window.location.href);
            cleanedUrl.searchParams.delete('reference');
            cleanedUrl.searchParams.delete('trxref');
            window.history.replaceState({}, '', cleanedUrl.toString());
            setTimeout(() => {
              completeVerifiedPurchaseRecord(paystackCallbackRef, pendingData);
            }, 300);
          }
        } catch (_) {}
      }

      if (storeParam) {
        setShowBioLinkPreview(true);
      }
    }
    loadSupabaseData(hasProdLanding);
  }, [currentProfile]);

  const loadSupabaseData = async (isViewingProductLanding = false) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user || null;
      const authMeta = authUser?.user_metadata || {};

      let activeUid = currentProfile?.id || authUser?.id;
      let activeMail = authUser?.email || currentProfile?.email || '';

      if (!activeUid) return;
      setUserId(activeUid);

      const isGoogleUser = Boolean(
        authUser?.app_metadata?.provider === 'google' ||
          (Array.isArray(authUser?.identities) &&
            authUser.identities.some((ident: any) => ident?.provider === 'google'))
      );
      setIsGoogleAuthUser(isGoogleUser);

      let localSaved: any = null;
      try {
        const v3Raw =
          localStorage.getItem(`horpal_p2_state_v3_${activeUid}`) ||
          localStorage.getItem(`horpal_p2_user_state_${activeUid}`);
        if (v3Raw) localSaved = JSON.parse(v3Raw);
      } catch (_) {}

      const deterministicCode = buildDeterministicAffiliateCode(activeUid);

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUid)
        .maybeSingle();

      const rawCode = prof?.affiliate_code || currentProfile?.affiliate_code || '';
      let resolvedAffiliateCode =
        rawCode && !rawCode.endsWith('-TEST') ? rawCode : deterministicCode;

      const isExplicitlyCompleted = Boolean(
        prof?.profile_completed ||
          authMeta?.profile_completed ||
          localSaved?.profile_completed
      );

      if (prof || authUser) {
        let fName = '';
        let lName = '';
        let resolvedHandle = '';
        let resolvedPhone = '';
        let resolvedCountry = '';

        if (isGoogleUser && !isExplicitlyCompleted) {
          // Google OAuth User with uncompleted Pillar 2 profile:
          // Do NOT auto-fill admin defaults, email prefix, or Google display metadata!
          // Leave missing fields blank so the user manually completes & saves their real profile.
          fName = (prof?.pillar2_first_name || '').trim();
          lName = (prof?.pillar2_last_name || '').trim();
          resolvedHandle = (prof?.username || '').replace(/^@+/, '').trim();
          resolvedPhone = (prof?.pillar2_phone || '').trim();
          resolvedCountry = (prof?.pillar2_country || '').trim();
        } else {
          // Standard Sign-Up User or Completed Profile: auto-populate from Supabase user_metadata + profiles
          const rawFullName = (
            prof?.pillar2_full_name ||
            prof?.full_name ||
            prof?.name ||
            authMeta?.full_name ||
            authMeta?.name ||
            ''
          ).trim();
          const parts = rawFullName ? rawFullName.split(/\s+/) : [];
          fName = (
            prof?.pillar2_first_name ||
            prof?.first_name ||
            authMeta?.first_name ||
            parts[0] ||
            localSaved?.firstName ||
            ''
          ).trim();
          lName = (
            prof?.pillar2_last_name ||
            prof?.last_name ||
            authMeta?.last_name ||
            parts.slice(1).join(' ') ||
            localSaved?.lastName ||
            ''
          ).trim();
          resolvedHandle = (
            prof?.username ||
            authMeta?.username ||
            authMeta?.preferred_username ||
            currentProfile?.username ||
            localSaved?.username ||
            fName ||
            ''
          )
            .replace(/^@+/, '')
            .trim();
          resolvedPhone = (
            prof?.pillar2_phone ||
            prof?.phone_number ||
            prof?.phone ||
            authMeta?.phone_number ||
            authMeta?.phone ||
            localSaved?.pillar2Phone ||
            ''
          ).trim();
          resolvedCountry = (
            prof?.pillar2_country ||
            prof?.country ||
            prof?.location_country ||
            authMeta?.country ||
            localSaved?.pillar2Country ||
            'Ghana'
          ).trim();
        }

        const missingRequiredForGoogle =
          isGoogleUser &&
          (!isExplicitlyCompleted ||
            !fName ||
            !lName ||
            !resolvedHandle ||
            !resolvedPhone ||
            !resolvedCountry);

        setProfileCompleted(!missingRequiredForGoogle);
        setIsMandatoryProfileCompletion(missingRequiredForGoogle);
        if (missingRequiredForGoogle && !isViewingProductLanding && !activeSalesPageProduct) {
          setActiveSettingsModal('pillar2_onboarding');
        }

        setUsername(resolvedHandle);
        setFirstName(fName);
        setLastName(lName);
        setCertificateStudentName(`${fName} ${lName}`.trim() || resolvedHandle);
        const resolvedEmail =
          activeMail || prof?.email || prof?.pillar2_email || '';
        setPillar2Email(resolvedEmail);
        setGlobalVerifiedEmail(resolvedEmail);
        setGlobalBeneficiaryName(`${fName} ${lName}`.trim() || resolvedHandle);

        setPillar2Phone(resolvedPhone);
        if (resolvedPhone) {
          setGlobalWhatsappPhone(resolvedPhone);
          setWaCloserNumber((prev) => prev || resolvedPhone.replace(/[^0-9]/g, ''));
        }

        setPillar2Country(resolvedCountry);
        if (prof?.pillar2_city) setPillar2City(prof.pillar2_city);
        if (prof?.pillar2_address) setPillar2Address(prof.pillar2_address);

        if ((!prof?.affiliate_code || prof.affiliate_code.endsWith('-TEST')) && deterministicCode) {
          resolvedAffiliateCode = deterministicCode;
          try {
            await supabase
              .from('profiles')
              .update({ affiliate_code: deterministicCode })
              .eq('id', activeUid);
          } catch (_) {}
        }

        // Reflect real database license state (strictly verified Pillar 2 payment + ref + expiry)
        const dbPaid = hasPillar2Access(prof);
        setHasActivePaidLicense(dbPaid);
        const resolvedExpiresIso = prof?.pillar2_expires_at || prof?.license_expires_at || null;
        const resolvedPaidIso = prof?.pillar2_paid_at || prof?.license_activated_at || null;
        const resolvedExpMs = resolvedExpiresIso ? new Date(resolvedExpiresIso).getTime() : 0;
        if (dbPaid && resolvedExpMs > Date.now()) {
          setLicenseExpiresAt(resolvedExpMs);
          if (resolvedPaidIso) {
            setLicenseActivatedAt(new Date(resolvedPaidIso).getTime());
          }
        } else if (dbPaid) {
          const fallbackExpMs = Date.now() + 365 * 24 * 60 * 60 * 1000;
          const actMs = resolvedPaidIso ? new Date(resolvedPaidIso).getTime() : Date.now();
          setLicenseActivatedAt(actMs);
          setLicenseExpiresAt(fallbackExpMs);
          if (!hasSyncedMissingExpiryRef.current) {
            hasSyncedMissingExpiryRef.current = true;
            authFetch('/api/pillar2/sync-license', { method: 'POST' })
              .then((r) => r.json())
              .then((syncJson) => {
                if (syncJson?.pillar2_expires_at) {
                  setLicenseExpiresAt(new Date(syncJson.pillar2_expires_at).getTime());
                }
              })
              .catch(() => {});
          }
        } else {
          setLicenseActivatedAt(0);
          setLicenseExpiresAt(0);
          setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
        }

        setUserAffiliateCode(resolvedAffiliateCode);
        setAvailableBalanceGHS(Number(prof?.affiliate_balance ?? prof?.available_balance_ghs ?? 0));
        setWithdrawnBalanceGHS(Number(prof?.affiliate_withdrawn ?? prof?.total_withdrawn ?? 0));
        setTotalClicksCount(Number(prof?.affiliate_link_clicks ?? 0));
      } else {
        setUserAffiliateCode(resolvedAffiliateCode);
        if (activeMail) {
          setPillar2Email(activeMail);
          setGlobalVerifiedEmail(activeMail);
        }
      }

      // 1. Strict User-Scoped Financial Sales Ledger (live from public.pillar2_sales)
      const p2SalesFilter = resolvedAffiliateCode
        ? `affiliate_user_id.eq.${activeUid},affiliate_code.eq.${resolvedAffiliateCode}`
        : `affiliate_user_id.eq.${activeUid}`;
      const { data: p2SalesRows } = await supabase
        .from('pillar2_sales')
        .select('*')
        .or(p2SalesFilter)
        .order('created_at', { ascending: false });

      const salesRows = (p2SalesRows || []).filter(
        (r: any) => !String(r.paystack_reference || '').toUpperCase().startsWith('HP_TEST_')
      );

      let saleNotifs: Array<{
        id: string;
        title: string;
        subtitle: string;
        amountGHS: number;
        timeAgo: string;
        read: boolean;
      }> = [];

      if (salesRows && salesRows.length > 0) {
        const nowUtc = new Date();
        const dayOfWeekUtc = nowUtc.getUTCDay();
        const daysSinceMonday = dayOfWeekUtc === 0 ? 6 : dayOfWeekUtc - 1;
        const mondayStartMs = Date.UTC(
          nowUtc.getUTCFullYear(),
          nowUtc.getUTCMonth(),
          nowUtc.getUTCDate() - daysSinceMonday,
          0,
          0,
          0,
          0
        );
        const computedWeeklyCount = salesRows.filter((row: any) => {
          const ts = row?.created_at ? new Date(row.created_at).getTime() : 0;
          return ts >= mondayStartMs;
        }).length;
        setWeeklySalesCount(computedWeeklyCount);

        const dbSalesCount = Number(prof?.affiliate_total_sales ?? 0);
        setTotalSalesCount(Math.max(dbSalesCount, salesRows.length));
        const totalComm = salesRows.reduce(
          (acc: number, row: any) =>
            acc + Number(row.commission_amount_ghs ?? 0),
          0
        );
        const dbTotalEarnings = Number(prof?.affiliate_total_earned ?? 0);
        setTotalEarningsGHS(Math.max(dbTotalEarnings, totalComm));

        const mappedTx = salesRows.map((row: any, idx: number) => ({
          id: row.id || `tx-${idx}`,
          orderUid: `ORD-${(row.id || '889120').toString().slice(0, 6).toUpperCase()}`,
          reference: row.paystack_reference || `HP-REF-${idx}`,
          productTitle: row.product_title || 'HorPal Digital Asset',
          amountGHS: Number(row.gross_amount_ghs || 0),
          commissionGHS: Number(row.commission_amount_ghs ?? 0),
          buyerName: row.buyer_name || 'Verified Customer',
          buyerEmail: row.buyer_email || '',
          buyerPhone: row.buyer_phone || '',
          date: new Date(row.created_at).toISOString().replace('T', ' ').substring(0, 16),
          status: 'COMPLETED'
        }));
        setTransactions(mappedTx);

        saleNotifs = mappedTx.map((t: any) => ({
          id: `notif-${t.id}`,
          title: `Sale Commission for ${t.productTitle}`,
          subtitle: `Buyer: ${t.buyerName} (${t.buyerEmail}) • Order ID: ${t.orderUid}`,
          amountGHS: t.commissionGHS,
          timeAgo: t.date,
          read: false
        }));
      } else {
        setWeeklySalesCount(0);
        setTotalSalesCount(Number(prof?.affiliate_total_sales ?? 0));
        setTotalEarningsGHS(Number(prof?.affiliate_total_earned ?? 0));
        setTransactions([]);
      }

      // 1B. Hydrate Buyer's Unlocked Courses & Exam Certificates from public.pillar2_unlocked_courses
      try {
        const resolvedBuyerEmail = (activeMail || prof?.email || prof?.pillar2_email || '')
          .trim()
          .toLowerCase();
        const unlockedCourseFilter = resolvedBuyerEmail
          ? `user_id.eq.${activeUid},buyer_email.eq.${resolvedBuyerEmail}`
          : `user_id.eq.${activeUid}`;
        const { data: p2UnlockedRows } = await supabase
          .from('pillar2_unlocked_courses')
          .select('product_id, exam_passed, certificate_id, paystack_reference')
          .or(unlockedCourseFilter);

        const validUnlockedRows = (p2UnlockedRows || []).filter(
          (r: any) =>
            Boolean(r.product_id) &&
            r.product_id !== 'pillar2_direct_90' &&
            !String(r.paystack_reference || '').toUpperCase().startsWith('HP_TEST_')
        );

        const mergedUnlocked = validUnlockedRows.map((r: any) => String(r.product_id));
        setUnlockedProductIds(Array.from(new Set(mergedUnlocked)));

        const certMap: Record<string, string> = {};
        validUnlockedRows.forEach((r: any) => {
          if (r.exam_passed && r.certificate_id) {
            certMap[String(r.product_id)] = String(r.certificate_id);
          }
        });
        setPassedCourseCertificates(certMap);
        if (certMap[examProductId]) {
          setCertificateCode(certMap[examProductId]);
          setCertificateUnlocked(true);
        }
      } catch (_) {}

      // 2. Strict User-Scoped Notifications (affiliate_notifications where user_id = activeUid)
      let dbNotifs: Array<{
        id: string;
        title: string;
        subtitle: string;
        amountGHS: number;
        timeAgo: string;
        read: boolean;
      }> = [];
      try {
        const { data: notifRows } = await supabase
          .from('affiliate_notifications')
          .select('*')
          .eq('user_id', activeUid)
          .order('created_at', { ascending: false })
          .limit(30);

        if (notifRows && notifRows.length > 0) {
          dbNotifs = notifRows.map((n: any) => ({
            id: n.id || `db-notif-${ Math.random() }`,
            title: n.title || 'HorPal Notification',
            subtitle: n.subtitle || n.message || '',
            amountGHS: Number(n.amount_ghs || 0),
            timeAgo: n.created_at ? new Date(n.created_at).toISOString().replace('T', ' ').substring(0, 16) : 'Recent',
            read: Boolean(n.read)
          }));
        }
      } catch (_) {}

      setNotificationsList([...dbNotifs, ...saleNotifs]);

      // 3. Strict User-Scoped Wallet Deposits History (kept separate from Financial Sales Ledger)
      try {
        const { data: walletRows } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', activeUid)
          .order('created_at', { ascending: false })
          .limit(20);

        if (walletRows) {
          setWalletHistory(
            walletRows.map((w: any) => ({
              id: w.id || `wal-${w.reference}`,
              reference: w.reference || '',
              type: (w.type || 'deposit').toUpperCase(),
              amountGHS: Number(w.amount || 0),
              date: w.created_at ? new Date(w.created_at).toISOString().replace('T', ' ').substring(0, 16) : '',
              status: (w.status || 'COMPLETED').toUpperCase()
            }))
          );
        }
      } catch (_) {}

      // 4. Strict User-Scoped Checkout Leads (filtered by affiliate_code = resolvedAffiliateCode)
      if (resolvedAffiliateCode) {
        const { data: leadsData } = await supabase
          .from('affiliate_checkout_leads')
          .select('*')
          .eq('affiliate_code', resolvedAffiliateCode)
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
        } else {
          setAbandonedLeads([]);
        }
      } else {
        setAbandonedLeads([]);
      }

      // 5. Strict User-Scoped Contest Submissions & Live Participant Counts
      try {
        const contestRes = await authFetch('/api/pillar2/contest-submit');
        if (contestRes.ok) {
          const contestJson = await contestRes.json().catch(() => null);
          if (contestJson?.success) {
            const subs = Array.isArray(contestJson.submissions) ? contestJson.submissions : [];
            setContestSubmissions(subs);
            setRegisteredContests(
              Array.from(new Set(subs.map((s: any) => String(s.contest_id || '')).filter(Boolean)))
            );
            if (contestJson.participantCounts) {
              setContestParticipantCounts({
                viral_100k: Number(contestJson.participantCounts.viral_100k || 0),
                sales_50: Number(contestJson.participantCounts.sales_50 || 0),
                sales_100: Number(contestJson.participantCounts.sales_100 || 0),
                weekly_top3: Number(contestJson.participantCounts.weekly_top3 || 0),
              });
            }
          }
        }
      } catch (_) {}

      // 6. Strict User-Scoped Payout Requests History (public.pillar2_payout_requests)
      try {
        const payoutRes = await authFetch('/api/pillar2/request-payout');
        if (payoutRes.ok) {
          const payoutJson = await payoutRes.json().catch(() => null);
          if (payoutJson?.success) {
            setPayoutRequests(Array.isArray(payoutJson.requests) ? payoutJson.requests : []);
            if (typeof payoutJson.affiliate_balance === 'number') {
              setAvailableBalanceGHS(payoutJson.affiliate_balance);
            }
            if (typeof payoutJson.affiliate_withdrawn === 'number') {
              setWithdrawnBalanceGHS(payoutJson.affiliate_withdrawn);
            }
          }
        }
      } catch (_) {}
    } catch (e) {
      console.error('Error loading Pillar 2 data:', e);
    }
  };

  // ============================================================================
  // SUPABASE REALTIME SYNC FOR PAYOUT LEDGER & COMMISSION BALANCE
  // ============================================================================
  useEffect(() => {
    if (!userId) return;
    let channel: any = null;
    try {
      const channelName =
        'horpal_p2_realtime_' + userId + '_' + Math.random().toString(36).substring(2, 9);
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload: any) => {
            const nextProf = payload?.new;
            if (nextProf) {
              setAvailableBalanceGHS(
                Number(nextProf.affiliate_balance ?? nextProf.available_balance_ghs ?? 0)
              );
              if (nextProf.affiliate_total_earned !== undefined || nextProf.total_earnings_ghs !== undefined) {
                setTotalEarningsGHS((prev) =>
                  Math.max(prev, Number(nextProf.affiliate_total_earned ?? nextProf.total_earnings_ghs ?? 0))
                );
              }
              if (nextProf.affiliate_withdrawn !== undefined || nextProf.total_withdrawn !== undefined) {
                setWithdrawnBalanceGHS(
                  Number(nextProf.affiliate_withdrawn ?? nextProf.total_withdrawn ?? 0)
                );
              }
              if (nextProf.affiliate_total_sales !== undefined || nextProf.sales_count !== undefined) {
                setTotalSalesCount((prev) =>
                  Math.max(prev, Number(nextProf.affiliate_total_sales ?? nextProf.sales_count ?? 0))
                );
              }
              if (nextProf.pillar2_expires_at) {
                const nextExpMs = new Date(nextProf.pillar2_expires_at).getTime();
                if (nextExpMs > Date.now()) {
                  setLicenseExpiresAt(nextExpMs);
                }
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'affiliate_sales',
          },
          () => {
            loadSupabaseData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pillar2_sales',
            filter: `affiliate_user_id=eq.${userId}`,
          },
          () => {
            loadSupabaseData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pillar2_payout_requests',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            loadSupabaseData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pillar2_contest_submissions',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            loadSupabaseData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'affiliate_notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            loadSupabaseData();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime fallback to polling:', err);
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (_) {}
    };
  }, [userId]);

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
    const cleanCode = userAffiliateCode || buildDeterministicAffiliateCode(userId);
    const uniqueToken = cleanCode ? `${cleanCode}-${product.shortCode}` : product.shortCode;
    const subParam = customSub ? `&sub=${encodeURIComponent(customSub)}` : '';
    return `${appOrigin}/affiliate?prod=${product.id}&ref=${encodeURIComponent(cleanCode)}&token=${encodeURIComponent(uniqueToken)}${subParam}`;
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

    const activeRef = attributedRefCode || userAffiliateCode;

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
        affiliate_code: activeRef,
        product_id: isDirectEnrollmentCheckout ? 'direct_90' : activeSalesPageProduct?.id || 'prod_faceless_ai',
        product_title: targetTitle,
        buyer_full_name: buyerFullName,
        buyer_email: buyerEmail,
        buyer_phone: `${buyerDialCode}${buyerPhone.replace(/^0+/, '')}`,
        buyer_country: buyerCountry,
        amount_ghs: targetAmountGHS
      });
    } catch (_) {}

    setCheckoutStep(2);
  };

  const completeVerifiedPurchaseRecord = async (reference: string, overrideMeta?: any) => {
    const cleanRef = String(reference || '').trim();
    if (!cleanRef || cleanRef.toUpperCase().startsWith('HP_TEST_')) {
      toast.error('Test purchases are disabled. Please complete real Paystack verification.');
      return;
    }

    const isDirect = overrideMeta?.isDirect ?? isDirectEnrollmentCheckout;
    const targetProductId = overrideMeta?.productId || activeSalesPageProduct?.id;
    const prod =
      products.find((p) => p.id === targetProductId) ||
      activeSalesPageProduct ||
      products[0] ||
      INITIAL_PRODUCTS[0];
    const baseGHS =
      overrideMeta?.payableGHS ??
      (isDirect ? DIRECT_ENROLLMENT_GHS : prod.priceGHS + (includeOrderBump ? 80 : 0));
    const commGHS = isDirect ? 0 : Number((baseGHS * 0.5).toFixed(2));
    const uniqueOrderUid = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const resolvedFullName = overrideMeta?.buyerName || buyerFullName || `${firstName} ${lastName}`.trim() || 'Verified Customer';
    const resolvedBuyerEmail = (overrideMeta?.buyerEmail || buyerEmail || pillar2Email || currentProfile?.email || '').trim().toLowerCase();
    const fullPhone = overrideMeta?.buyerPhone || `${buyerDialCode}${buyerPhone.replace(/^0+/, '')}`;
    const activeRef = (overrideMeta?.affiliateCode || attributedRefCode || userAffiliateCode || '').trim();

    if (isDirect) {
      const verifyRes = await authFetch('/api/paystack/verify-pillar2-pass', {
        method: 'POST',
        body: JSON.stringify({
          reference: cleanRef,
          email: resolvedBuyerEmail,
          passType: 'registration_1yr',
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData?.success) {
        toast.error(verifyData?.error || 'Could not verify Pillar 2 enrollment payment.');
        return;
      }
      const paidMs = verifyData.pillar2_paid_at ? new Date(verifyData.pillar2_paid_at).getTime() : Date.now();
      const expMs = verifyData.pillar2_expires_at ? new Date(verifyData.pillar2_expires_at).getTime() : paidMs + 365 * 24 * 60 * 60 * 1000;
      setHasActivePaidLicense(true);
      setLicenseActivatedAt(paidMs);
      setLicenseExpiresAt(expMs);
      setCheckoutStep(null);
      setActiveSalesPageProduct(null);
      setTimeout(() => {
        loadSupabaseData();
      }, 400);
      onRefreshProfile?.();
      toast.success('Direct Pillar 2 Affiliate License Activated for 365 Days!');
      return;
    }

    // Verify Product Purchase server-side via /api/pillar2/verify-product-purchase
    const verifyRes = await authFetch('/api/pillar2/verify-product-purchase', {
      method: 'POST',
      body: JSON.stringify({
        reference: cleanRef,
        productId: prod.id,
        productTitle: prod.title,
        grossAmountGHS: baseGHS,
        affiliateCode: activeRef,
        buyerUserId: userId,
        buyerName: resolvedFullName,
        buyerEmail: resolvedBuyerEmail,
        buyerPhone: fullPhone,
      }),
    });

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData?.success) {
      toast.error(verifyData?.error || 'Paystack could not verify this product purchase.');
      return;
    }

    // 1. Unlock course immediately in buyer's My Unlocked Courses & Drive Vault
    setUnlockedProductIds((prev) => (prev.includes(prod.id) ? prev : [...prev, prod.id]));

    // 2. Grant Buyer full Pillar 2 Affiliate Hub access automatically (no separate GH₵ 90 fee needed!)
    const paidMs = verifyData.pillar2_paid_at ? new Date(verifyData.pillar2_paid_at).getTime() : Date.now();
    const expMs = verifyData.pillar2_expires_at ? new Date(verifyData.pillar2_expires_at).getTime() : paidMs + 365 * 24 * 60 * 60 * 1000;
    setHasActivePaidLicense(true);
    setLicenseActivatedAt(paidMs);
    setLicenseExpiresAt(expMs);
    setIsLockedDashboardModalOpen(false);

    setCheckoutStep(null);
    setTimeout(() => {
      loadSupabaseData();
    }, 400);
    onRefreshProfile?.();

    toast.success(
      `Payment Verified! "${prod.title}" is now unlocked in your Drive Vault & your Pillar 2 Affiliate Hub is active!`
    );
    alert(
      `✅ Verified Paystack Purchase Confirmed!\n\nOrder ID: ${uniqueOrderUid}\nReference: ${cleanRef}\nBuyer: ${resolvedFullName} (${resolvedBuyerEmail})\nCourse Unlocked: ${prod.title}\n50% Affiliate Commission Credited (${activeRef || 'DIRECT'}): GH₵ ${(verifyData.commissionCreditedGHS ?? commGHS).toFixed(2)}\n\nYour course is now unlocked inside My Unlocked Courses & Drive Vault, and your full Pillar 2 Affiliate Hub access is now ACTIVE!`
    );
  };

  const handleLivePaystackCheckout = async () => {
    const isDirect = isDirectEnrollmentCheckout;
    const prod = activeSalesPageProduct || products[0] || INITIAL_PRODUCTS[0];
    const payableGHS = isDirect ? DIRECT_ENROLLMENT_GHS : prod.priceGHS + (includeOrderBump ? 80 : 0);
    const ref = `HP_P2_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const activeRef = (attributedRefCode || userAffiliateCode || '').trim();
    const cleanPayEmail = (buyerEmail || pillar2Email || currentProfile?.email || '').trim().toLowerCase();
    const fullPhone = `${buyerDialCode}${buyerPhone.replace(/^0+/, '')}`;

    if (!cleanPayEmail || !cleanPayEmail.includes('@')) {
      toast.error('Please enter a valid email address before proceeding to Paystack.');
      return;
    }

    const metadata: any = {
      user_id: userId,
      email: cleanPayEmail,
      payment_type: isDirect ? 'P2_LICENSE' : 'PRODUCT_PURCHASE',
      product_id: isDirect ? 'pillar2_direct_90' : prod.id,
      product_title: isDirect ? 'HorPal Pillar 2 Direct Enrollment' : prod.title,
      affiliate_code: activeRef,
      buyer_name: buyerFullName || `${firstName} ${lastName}`.trim(),
      buyer_phone: fullPhone,
    };

    try {
      sessionStorage.setItem(
        'horpal_pending_p2_product_purchase',
        JSON.stringify({
          isDirect,
          productId: prod.id,
          productTitle: prod.title,
          payableGHS,
          affiliateCode: activeRef,
          buyerName: buyerFullName || `${firstName} ${lastName}`.trim(),
          buyerEmail: cleanPayEmail,
          buyerPhone: fullPhone,
        })
      );
    } catch (_) {}

    const redirectViaStandardPaystack = async () => {
      try {
        const initRes = await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanPayEmail,
            amount: Math.round(payableGHS * 100),
            currency: 'GHS',
            reference: ref,
            callback_url: typeof window !== 'undefined' ? window.location.href : undefined,
            metadata,
          }),
        });
        const initData = await initRes.json();
        if (initRes.ok && initData?.authorization_url) {
          window.location.href = initData.authorization_url;
          return;
        }
        toast.error(initData?.error || 'Unable to launch Paystack checkout. Please try again.');
      } catch (err: any) {
        toast.error(err?.message || 'Network error initializing Paystack.');
      }
    };

    const openPopup = () => {
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop || !PAYSTACK_PUBLIC_KEY) {
        redirectViaStandardPaystack();
        return;
      }
      try {
        const handler = PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: cleanPayEmail,
          amount: Math.round(payableGHS * 100),
          currency: 'GHS',
          ref,
          metadata,
          callback: (response: any) => {
            const actualRef = response?.reference || ref;
            try {
              sessionStorage.removeItem('horpal_pending_p2_product_purchase');
            } catch (_) {}
            completeVerifiedPurchaseRecord(actualRef);
          },
        });
        handler.openIframe();
      } catch (_) {
        redirectViaStandardPaystack();
      }
    };

    if (typeof window !== 'undefined' && !(window as any).PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = openPopup;
      script.onerror = () => {
        redirectViaStandardPaystack();
      };
      document.body.appendChild(script);
    } else {
      openPopup();
    }
  };
  const launchPaystackFromStep2 = handleLivePaystackCheckout;

  // ============================================================================
  // SAVE SEPARATE PILLAR 2 PROFILE DETAILS
  // ============================================================================
  const handleSavePillar2Profile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileValidationError(null);
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanUsername = username.replace(/^@+/, '').trim();
    const cleanPhone = pillar2Phone.trim();
    const cleanCountry = pillar2Country.trim();
    const cleanFull = `${cleanFirst} ${cleanLast}`.trim();
    const lockedEmail = currentProfile?.email || pillar2Email;

    const needsProfileFields =
      isMandatoryProfileCompletion ||
      activeSettingsModal === 'profile' ||
      activeSettingsModal === 'pillar2_onboarding';

    if (needsProfileFields && (!cleanFirst || !cleanLast || !cleanUsername || !cleanPhone || !cleanCountry)) {
      setProfileValidationError(
        'Please complete your First Name, Last Name, Username, Phone Number, and Country before saving.'
      );
      return;
    }

    setIsSavingProfile(true);
    setUsername(cleanUsername);
    setCertificateStudentName(cleanFull || cleanUsername);
    setGlobalBeneficiaryName(cleanFull || cleanUsername);

    if (userId) {
      try {
        await supabase
          .from('profiles')
          .update({
            username: cleanUsername,
            first_name: cleanFirst,
            last_name: cleanLast,
            full_name: cleanFull || cleanUsername,
            phone_number: cleanPhone,
            phone: cleanPhone,
            country: cleanCountry,
            location_country: cleanCountry,
            pillar2_first_name: cleanFirst,
            pillar2_last_name: cleanLast,
            pillar2_email: lockedEmail,
            pillar2_phone: cleanPhone,
            pillar2_country: cleanCountry,
            pillar2_city: pillar2City,
            pillar2_address: pillar2Address,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        // Best-effort updates for schema-optional profile completion & KYC columns
        try {
          await supabase
            .from('profiles')
            .update({ profile_completed: true })
            .eq('id', userId);
        } catch (_) {}
        try {
          await supabase
            .from('profiles')
            .update({
              pillar2_push_notifications: pushNotificationsEnabled,
              pillar2_kyc_id_type: kycIdType,
              pillar2_kyc_id_number: kycIdNumber,
              pillar2_2fa_enabled: twoFactorEnabled,
            })
            .eq('id', userId);
        } catch (_) {}

        // Persist into Supabase Auth user_metadata as well
        try {
          await supabase.auth.updateUser({
            data: {
              first_name: cleanFirst,
              last_name: cleanLast,
              full_name: cleanFull || cleanUsername,
              username: cleanUsername,
              phone_number: cleanPhone,
              phone: cleanPhone,
              country: cleanCountry,
              profile_completed: true,
            }
          });
        } catch (_) {}

        const existingCacheStr =
          localStorage.getItem(`horpal_p2_state_v3_${userId}`) ||
          localStorage.getItem(`horpal_p2_user_state_${userId}`);
        const existingCache = existingCacheStr ? JSON.parse(existingCacheStr) : {};
        localStorage.setItem(
          `horpal_p2_state_v3_${userId}`,
          JSON.stringify({
            ...existingCache,
            firstName: cleanFirst,
            lastName: cleanLast,
            username: cleanUsername,
            pillar2Email: lockedEmail,
            pillar2Phone: cleanPhone,
            pillar2Country: cleanCountry,
            pillar2City,
            pillar2Address,
            profile_completed: true
          })
        );
        try {
          localStorage.removeItem(`horpal_p2_user_state_${userId}`);
        } catch (_) {}
      } catch (_) {}
    }

    setProfileCompleted(true);
    setIsMandatoryProfileCompletion(false);
    setActiveSettingsModal(null);
    setIsSavingProfile(false);

    if (onRefreshProfile) {
      try {
        await onRefreshProfile();
      } catch (_) {}
    }
    setSettingsSavedBanner('✅ Profile & Account Details synced to your HorPal Supabase profile!');
    setTimeout(() => setSettingsSavedBanner(null), 3500);
  };

  // ============================================================================
  // HIGH-RES DOWNLOAD HELPERS (CERTIFICATE & QR CODE)
  // ============================================================================
  const handleDownloadCertificate = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 2000;
      canvas.height = 1414; // ISO A-series aspect ratio for landscape

      // 1. Deep obsidian-navy background
      ctx.fillStyle = '#060A14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Double metallic gold borders
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 12;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

      // Corner Ornaments
      const cornerSize = 80;
      ctx.fillStyle = '#F59E0B';
      // Top-Left
      ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(40 + cornerSize, 40); ctx.lineTo(40, 40 + cornerSize); ctx.fill();
      // Top-Right
      ctx.beginPath(); ctx.moveTo(canvas.width - 40, 40); ctx.lineTo(canvas.width - 40 - cornerSize, 40); ctx.lineTo(canvas.width - 40, 40 + cornerSize); ctx.fill();
      // Bottom-Left
      ctx.beginPath(); ctx.moveTo(40, canvas.height - 40); ctx.lineTo(40 + cornerSize, canvas.height - 40); ctx.lineTo(40, canvas.height - 40 - cornerSize); ctx.fill();
      // Bottom-Right
      ctx.beginPath(); ctx.moveTo(canvas.width - 40, canvas.height - 40); ctx.lineTo(canvas.width - 40 - cornerSize, canvas.height - 40); ctx.lineTo(canvas.width - 40, canvas.height - 40 - cornerSize); ctx.fill();

      // 3. Top Header
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FDE68A';
      ctx.font = 'bold 60px serif';
      ctx.fillText('HORPAL EXECUTIVE ACADEMY', canvas.width / 2, 200);

      ctx.fillStyle = '#9CA3AF';
      ctx.font = '30px sans-serif';
      ctx.letterSpacing = '5px';
      ctx.fillText('OFFICIAL CHARTER OF DIGITAL & AFFILIATE MASTERY', canvas.width / 2, 260);
      ctx.letterSpacing = '0px';

      // 4. Recipient Banner
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '40px serif';
      ctx.fillText('THIS PROUDLY CERTIFIES THAT', canvas.width / 2, 420);

      ctx.fillStyle = '#FDE68A';
      ctx.font = 'bold italic 100px serif';
      const formattedName = certificateStudentName.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      ctx.fillText(formattedName, canvas.width / 2, 550);

      // Name Underline
      const nameWidth = ctx.measureText(formattedName).width;
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo((canvas.width - nameWidth) / 2 - 40, 580);
      ctx.lineTo((canvas.width + nameWidth) / 2 + 40, 580);
      ctx.stroke();

      // 5. Course Statement
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '36px sans-serif';
      ctx.fillText('has successfully mastered all 5 rigorous examination modules with', canvas.width / 2, 680);
      ctx.fillText('Distinction (90%+ Standard) in', canvas.width / 2, 740);

      const courseTitle = products.find(p => p.id === examProductId)?.title || "Digital Marketing Academy";
      ctx.fillStyle = '#34D399'; // Emerald-400
      ctx.font = 'bold 50px sans-serif';
      ctx.fillText(courseTitle, canvas.width / 2, 820);

      // 6. Verified Competency Pillars
      ctx.fillStyle = '#D1D5DB';
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'left';
      const pillarsX = canvas.width / 2 - 450;
      ctx.fillText('✓ Attribution & Funnel Architecture', pillarsX, 940);
      ctx.fillText('✓ High-Converting Traffic Engineering', pillarsX, 1000);

      const pillarsRightX = canvas.width / 2 + 100;
      ctx.fillText('✓ WhatsApp & Social Closing Mastery', pillarsRightX, 940);
      ctx.fillText('✓ Ethical Governance & Compliance', pillarsRightX, 1000);

      // 7. 3-Column Footer
      // Left - Signature
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FDE68A';
      ctx.font = 'italic 50px serif';
      ctx.fillText('Gerald', 400, 1180);
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(250, 1200); ctx.lineTo(550, 1200); ctx.stroke();
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '20px sans-serif';
      ctx.fillText('GERALD • FOUNDER & CEO, HORPAL', 400, 1230);

      // Center - 3D Gold Seal
      ctx.beginPath();
      ctx.arc(canvas.width / 2, 1180, 80, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(canvas.width / 2, 1180, 10, canvas.width / 2, 1180, 80);
      gradient.addColorStop(0, '#FDE68A');
      gradient.addColorStop(1, '#B45309');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = '#FEF3C7';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('100% VERIFIED', canvas.width / 2, 1165);
      ctx.fillText('DISTINCTION', canvas.width / 2, 1195);
      ctx.font = '16px sans-serif';
      ctx.fillText('SEAL • HORPAL', canvas.width / 2, 1220);

      // Right - QR & Metadata
      const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent('https://www.horpal.com/affiliate?verify=' + certificateCode)}`;

      const drawRightFooter = (qrImg?: HTMLImageElement) => {
        if (qrImg) {
          ctx.drawImage(qrImg, canvas.width - 460, 1110, 120, 120);
        }
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '24px monospace';
        ctx.fillText(`DATE ISSUED: ${new Date().toLocaleDateString()}`, canvas.width - 400, 1260);
        ctx.fillText(`CREDENTIAL ID: ${certificateCode}`, canvas.width - 400, 1290);

        // Finally, save and download
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `HorPal-Certificate-${certificateCode}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setDownloadSuccessBanner('Official High-Res Certificate downloaded!');
          setTimeout(() => setDownloadSuccessBanner(null), 4000);
        }, 'image/png');
      };

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => drawRightFooter(img);
      img.onerror = () => drawRightFooter();
      img.src = qrDataUrl;

    } catch (e) {
      console.error('Error generating certificate:', e);
    }
  };

  const handleDownloadQrCode = async (linkUrl: string, labelName?: string) => {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&data=${encodeURIComponent(linkUrl)}`;
    const filename = `HorPal-QR-${(labelName || 'link').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;

    try {
      const res = await fetch(qrApiUrl);
      if (!res.ok) throw new Error('Network response was not ok');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setDownloadSuccessBanner('✓ QR Code saved to your device!');
      setTimeout(() => setDownloadSuccessBanner(null), 4000);
    } catch (e) {
      // Fallback
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (ctx) ctx.drawImage(img, 0, 0, 600, 600);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setDownloadSuccessBanner('✓ QR Code saved to your device!');
          setTimeout(() => setDownloadSuccessBanner(null), 4000);
        }, 'image/png');
      };
      img.src = qrApiUrl;
    }
  };

  // ============================================================================
  // 5-STEP EXAMINATION GRADING (90% MINIMUM REQUIRED TO ADVANCE)
  // ============================================================================
  const handleGradeExamStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockedProductIds.includes(examProductId)) {
      toast.error('Please unlock this course via verified purchase before taking its certification exam.');
      return;
    }

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
        // Passed all 5 steps with >= 90%! Update public.pillar2_unlocked_courses in Supabase
        const generatedCertCode = `HP-CERT-${Math.floor(100000 + Math.random() * 900000)}`;
        const selectedCourse =
          products.find((p) => p.id === examProductId) || INITIAL_PRODUCTS[0];
        let finalCertCode = generatedCertCode;

        try {
          const { data: rpcCert } = await supabase.rpc('mark_pillar2_exam_passed_rpc', {
            p_user_id: userId,
            p_email: (pillar2Email || currentProfile?.email || '').trim().toLowerCase(),
            p_product_id: selectedCourse.id,
            p_certificate_id: generatedCertCode,
          });
          if (rpcCert?.certificate_id) {
            finalCertCode = String(rpcCert.certificate_id);
          }
        } catch (_) {}

        try {
          await supabase.from('affiliate_certificates').insert({
            user_id: userId,
            student_name: `${firstName} ${lastName}`.trim(),
            product_id: selectedCourse.id,
            product_title: selectedCourse.title,
            certificate_code: finalCertCode,
            final_score_percent: scorePercent
          });
        } catch (_) {}

        setCertificateCode(finalCertCode);
        setPassedCourseCertificates((prev) => ({ ...prev, [selectedCourse.id]: finalCertCode }));
        setCertificateUnlocked(true);
      }
    }
  };

  // ============================================================================
  // CONTEST REGISTRATION, MILESTONE ADMIN ALERT & 100K VIEWS SUBMISSION
  // ============================================================================
  const handleContestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contestModalOpen || isSubmittingContest) return;
    setIsSubmittingContest(true);

    const contestTitles: Record<string, string> = {
      viral_100k: 'TikTok & IG 100K Views Challenge (GH₵ 10,000)',
      sales_50: '50-Sales Executive Sprint (GH₵ 3,500)',
      sales_100: '100-Sales Grand Producer Challenge (MacBook Pro M3 + GH₵ 10,000)',
      weekly_top3: 'Weekly Friday Fast-Start Top 3 Pool (GH₵ 2,000 / Week)',
    };
    const resolvedContestTitle = contestTitles[contestModalOpen] || contestModalOpen;
    const resolvedFullName =
      (contestFullName || `${firstName} ${lastName}`.trim() || 'HorPal Affiliate').trim();
    const resolvedEmail = (pillar2Email || currentProfile?.email || '').trim();
    const resolvedPhone = (contestPhone || pillar2Phone || '').trim();

    try {
      const res = await authFetch('/api/pillar2/contest-submit', {
        method: 'POST',
        body: JSON.stringify({
          contestId: contestModalOpen,
          contestTitle: resolvedContestTitle,
          fullName: resolvedFullName,
          email: resolvedEmail,
          phone: resolvedPhone,
          platformHandle: contestSocialHandle,
          videoOrProofUrl: contestVideoUrl,
          notes: contestBankMomoDetails,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error || 'Could not submit contest entry.');
        return;
      }

      if (json.submission) {
        setContestSubmissions((prev) => [json.submission, ...prev]);
      }
      setRegisteredContests((prev) =>
        prev.includes(contestModalOpen) ? prev : [...prev, contestModalOpen]
      );
      setContestParticipantCounts((prev) => ({
        ...prev,
        [contestModalOpen]: Math.max(1, (prev[contestModalOpen] || 0) + 1),
      }));
      setContestStatusBanner(
        `✅ ${resolvedContestTitle} entry saved & dispatched to Admin! Track status live on the contest card below.`
      );
      toast.success('Contest submission saved & Admin notified!');
      setContestModalOpen(null);
      setContestVideoUrl('');
      setContestBankMomoDetails('');
    } catch (err: any) {
      toast.error(err?.message || 'Network error while submitting contest entry.');
    } finally {
      setIsSubmittingContest(false);
    }
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
  // STRICT FRIDAY GMT ENFORCEMENT & LIVE COUNTDOWN TO FRIDAY 00:00 GMT
  // ============================================================================
  const [isFridayGMT, setIsFridayGMT] = useState<boolean>(() => new Date().getUTCDay() === 5);
  const [fridayCountdown, setFridayCountdown] = useState<{
    days: number;
    hours: string;
    minutes: string;
    seconds: string;
  }>({ days: 0, hours: '00', minutes: '00', seconds: '00' });

  useEffect(() => {
    const computeFridayCountdown = () => {
      const now = new Date();
      const utcDay = now.getUTCDay();
      const isFri = utcDay === 5;
      setIsFridayGMT(isFri);

      if (isFri) {
        setFridayCountdown({ days: 0, hours: '00', minutes: '00', seconds: '00' });
        return;
      }

      // Calculate next Friday 00:00:00 UTC
      const daysUntilFriday = (5 - utcDay + 7) % 7 || 7;
      const nextFridayUTC = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + daysUntilFriday,
        0,
        0,
        0,
        0
      );
      const diffMs = Math.max(0, nextFridayUTC - now.getTime());
      const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const h = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diffMs % (1000 * 60)) / 1000);

      setFridayCountdown({
        days: d,
        hours: h.toString().padStart(2, '0'),
        minutes: m.toString().padStart(2, '0'),
        seconds: s.toString().padStart(2, '0')
      });
    };

    computeFridayCountdown();
    const interval = setInterval(computeFridayCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCompleteRenewal = async (newExpiresAtIso?: string, updatedBalance?: number) => {
    const nowMs = Date.now();
    const nextExpMs = newExpiresAtIso
      ? new Date(newExpiresAtIso).getTime()
      : nowMs + 365 * 24 * 60 * 60 * 1000;
    // 1. Activate and reset timer for 365 days
    setHasActivePaidLicense(true);
    setLicenseActivatedAt(nowMs);
    setLicenseExpiresAt(nextExpMs);
    if (typeof updatedBalance === 'number') {
      setAvailableBalanceGHS(updatedBalance);
    }
    const diffMs = Math.max(0, nextExpMs - nowMs);
    setTimeRemaining({
      days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diffMs % (1000 * 60)) / 1000),
      expired: false,
    });
    expiryAlertSentRef.current = false;

    onRefreshProfile?.();

    // 2. Record renewal in walletHistory (strictly separated from Financial Sales Ledger)
    const walletEntry = {
      id: `renew-${Date.now()}`,
      reference: `HP_REN_${Date.now()}`,
      type: 'LICENSE_RENEWAL',
      amountGHS: 45,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'VERIFIED'
    };
    setWalletHistory((prev) => [walletEntry, ...prev]);

    // 3. Notify Admin
    try {
      await fetch('/api/affiliate/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'LICENSE_RENEWAL_CONFIRMED',
          payload: {
            subject: `✅ Affiliate GH₵ 45 Renewal Confirmed (${pillar2Email})`,
            message: `User: ${firstName} ${lastName}\nAffiliate ID: ${userAffiliateCode}\nStatus: The user has successfully paid their GH₵ 45.00 annual renewal fee. Access has been restored for another 365 days.`
          }
        })
      });
    } catch (_) {}

    setIsRenewalModalOpen(false);
    onRefreshProfile?.();
    alert('✅ License Successfully Renewed for 1 Year!\n\nYour HorPal Affiliate Dashboard has been unlocked for another 365 days!');
  };

  // ============================================================================
  // NATIVE PAYSTACK DEPOSIT (NO IN-APP 6-DIGIT CODE)
  // ============================================================================
  const handleNativePaystackDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const addedGHS = Number(depositAmountGHS);
    if (!addedGHS || addedGHS <= 0) {
      alert('Please enter a valid deposit amount.');
      return;
    }

    const activeEmail = pillar2Email || currentProfile?.email || buyerEmail;
    if (!activeEmail) {
      alert('Please ensure your account email is loaded before depositing.');
      return;
    }

    const ref = `HP_DEP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const verifyAndCreditDeposit = async (paymentReference: string) => {
      setIsVerifyingDeposit(true);
      try {
        const res = await fetch('/api/paystack/verify-deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: paymentReference,
            userId,
            amountGHS: addedGHS
          })
        });
        const data = await res.json();

        if (!res.ok || data?.error) {
          alert(data?.error || 'Could not verify Paystack deposit. Please contact support if debited.');
          setIsVerifyingDeposit(false);
          return;
        }

        const verifiedAmount = Number(data?.amount || addedGHS);
        setAvailableBalanceGHS((prev) => Number((prev + verifiedAmount).toFixed(2)));

        // Record strictly in walletHistory (NEVER in Financial Sales Ledger transactions)
        setWalletHistory((prev) => [
          {
            id: `dep-${Date.now()}`,
            reference: paymentReference,
            type: 'DEPOSIT',
            amountGHS: verifiedAmount,
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            status: 'VERIFIED'
          },
          ...prev
        ]);

        setNotificationsList((prev) => [
          {
            id: `notif-dep-${Date.now()}`,
            title: '💰 Paystack Deposit Verified',
            subtitle: `GH₵ ${verifiedAmount.toFixed(2)} has been credited to your Available Balance (Ref: ${paymentReference}).`,
            amountGHS: verifiedAmount,
            timeAgo: 'Just now',
            read: false
          },
          ...prev
        ]);

        onRefreshProfile?.();
        setIsDepositModalOpen(false);
        setDepositAmountGHS('');
        setDownloadSuccessBanner(
          `✓ Paystack Deposit of GH₵ ${verifiedAmount.toFixed(2)} verified & credited to your Available Balance!`
        );
        setTimeout(() => setDownloadSuccessBanner(null), 4500);
      } catch (err) {
        alert('Network error verifying deposit with /api/paystack/verify-deposit.');
      } finally {
        setIsVerifyingDeposit(false);
      }
    };

    const openPopup = () => {
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop || !PAYSTACK_PUBLIC_KEY) {
        alert('Paystack inline checkout is initializing or missing NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.');
        return;
      }

      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: activeEmail,
        amount: Math.round(addedGHS * 100),
        currency: 'GHS',
        ref,
        metadata: {
          user_id: userId,
          email: activeEmail,
          payment_type: 'WALLET_DEPOSIT'
        },
        callback: (response: any) => {
          const actualRef = response?.reference || ref;
          verifyAndCreditDeposit(actualRef);
        }
      });
      handler.openIframe();
    };

    if (typeof window !== 'undefined' && !(window as any).PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = openPopup;
      script.onerror = () => alert('Failed to load Paystack checkout script. Please check your connection.');
      document.body.appendChild(script);
    } else {
      openPopup();
    }
  };

  // ============================================================================
  // TAB A: VERIFY ACCOUNT VIA PAYSTACK RESOLVE API & SUBMIT AUTO PAYOUT
  // ============================================================================
  const handleResolvePaystackAccount = async () => {
    if (!paystackAccountNumber.trim() || !paystackBankCode.trim()) {
      setAccountResolveError('Please select a Provider/Bank Code and enter your Account/MoMo Number first.');
      return;
    }
    setIsResolvingAccount(true);
    setAccountResolveError(null);
    setAccountResolvedBadge(null);

    try {
      const query = `/api/affiliate/payout?action=resolve&account_number=${encodeURIComponent(
        paystackAccountNumber.trim()
      )}&bank_code=${encodeURIComponent(paystackBankCode.trim())}&country=${encodeURIComponent(
        paystackEligibleCountry
      )}`;
      const res = await fetch(query, { method: 'GET' });
      const data = await res.json();

      if (res.ok && (data?.account_name || data?.data?.account_name)) {
        const resolvedName = data.account_name || data.data.account_name;
        setAccountHolderName(resolvedName);
        setAccountResolvedBadge(`✓ Verified via Paystack Resolve: ${resolvedName}`);
      } else {
        setAccountResolveError(
          data?.error || data?.message || 'Could not auto-resolve name for this provider. Please verify and confirm your legal name manually.'
        );
      }
    } catch (_) {
      setAccountResolveError('Paystack Resolve check completed — please verify your legal account name matches your registered ID.');
    } finally {
      setIsResolvingAccount(false);
    }
  };

  const handlePaystackAutoPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutFeedback(null);

    if (freezeP2Withdrawals) {
      setPayoutFeedback({
        type: 'error',
        text: '⏸️ Withdrawals are temporarily paused for scheduled settlement auditing.',
      });
      return;
    }

    const amount = parseFloat(payoutAmountGHS);
    if (isNaN(amount) || amount <= 0) {
      setPayoutFeedback({ type: 'error', text: 'Please enter a valid withdrawal amount greater than GH₵ 0.00.' });
      return;
    }
    if (amount > availableBalanceGHS) {
      setPayoutFeedback({
        type: 'error',
        text: `Insufficient available balance (Max: GH₵ ${availableBalanceGHS.toFixed(2)}).`
      });
      return;
    }
    if (!paystackAccountNumber.trim() || !accountHolderName.trim()) {
      setPayoutFeedback({
        type: 'error',
        text: 'Please provide your Account / Mobile Money Number and Registered Legal Name.'
      });
      return;
    }

    const currentCountryProviders =
      PAYSTACK_CORRIDOR_PROVIDERS[paystackEligibleCountry] || PAYSTACK_CORRIDOR_PROVIDERS['Ghana (GHS)'];
    const methodList =
      paystackSettlementMethod === 'MOBILE_MONEY'
        ? currentCountryProviders.MOBILE_MONEY
        : currentCountryProviders.LOCAL_BANK;
    const matchedProvider = methodList.find((p) => p.code === paystackBankCode);

    const codeUpper = String(paystackBankCode || '').toUpperCase();
    const resolvedPayoutMethod =
      paystackSettlementMethod === 'LOCAL_BANK'
        ? 'Bank Transfer'
        : codeUpper === 'MTN'
        ? 'MTN Mobile Money'
        : codeUpper === 'VOD' || codeUpper === 'TELECEL'
        ? 'Telecel Cash'
        : codeUpper === 'ATL' || codeUpper === 'AT'
        ? 'AT Money'
        : matchedProvider?.name || 'Mobile Money';

    const resolvedBankOrNetwork = `${paystackEligibleCountry} • ${matchedProvider?.name || paystackBankCode}`;

    setIsSubmittingPayout(true);
    try {
      const response = await authFetch('/api/pillar2/request-payout', {
        method: 'POST',
        body: JSON.stringify({
          amountGHS: amount,
          payoutMethod: resolvedPayoutMethod,
          accountName: accountHolderName.trim(),
          accountNumber: paystackAccountNumber.trim(),
          bankOrNetwork: resolvedBankOrNetwork,
          phone: pillar2Phone,
          affiliateName: `${firstName} ${lastName}`.trim() || accountHolderName.trim(),
          affiliateEmail: (pillar2Email || currentProfile?.email || '').trim(),
        })
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok || !resData?.success) {
        setPayoutFeedback({
          type: 'error',
          text: resData?.error || 'Failed to submit payout request. Please verify your available balance and details.'
        });
        return;
      }

      if (typeof resData?.balance_after_ghs === 'number') {
        setAvailableBalanceGHS(resData.balance_after_ghs);
      } else {
        setAvailableBalanceGHS((prev) => Number(Math.max(0, prev - amount).toFixed(2)));
      }
      if (resData?.request) {
        setPayoutRequests((prev) => [resData.request, ...prev]);
      }
      setPayoutAmountGHS('');
      const msg =
        `💸 Payout Request of GH₵ ${amount.toFixed(2)} (${resolvedPayoutMethod} • ${paystackAccountNumber.trim()}) submitted! Track live Admin status below.`;
      setPayoutFeedback({ type: 'success', text: msg });
      toast.success('Payout request submitted & Admin notified!');
    } catch (_) {
      setPayoutFeedback({
        type: 'error',
        text: 'Could not dispatch payout request. Please check your internet connection.'
      });
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // ============================================================================
  // TAB B: GLOBAL MANUAL SETTLEMENT PORTAL SUBMISSION (ALL OTHER COUNTRIES)
  // ============================================================================
  const isValidUsdtWallet = useMemo(() => {
    const addr = globalCryptoAddress.trim();
    if (!addr) return false;
    if (globalCryptoNetwork === 'USDT-TRC20') {
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);
    }
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  }, [globalCryptoAddress, globalCryptoNetwork]);

  const handleGlobalManualPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutFeedback(null);

    if (freezeP2Withdrawals) {
      setPayoutFeedback({
        type: 'error',
        text: '⏸️ Withdrawals are temporarily paused for scheduled settlement auditing.',
      });
      return;
    }

    const amount = parseFloat(payoutAmountGHS);
    if (isNaN(amount) || amount <= 0) {
      setPayoutFeedback({ type: 'error', text: 'Please enter a valid withdrawal amount greater than GH₵ 0.00.' });
      return;
    }
    if (amount > availableBalanceGHS) {
      setPayoutFeedback({
        type: 'error',
        text: `Insufficient available balance (Max: GH₵ ${availableBalanceGHS.toFixed(2)}).`
      });
      return;
    }

    if (!globalBeneficiaryName.trim() || !globalCityStatePostal.trim() || !globalWhatsappPhone.trim() || !globalVerifiedEmail.trim()) {
      setPayoutFeedback({
        type: 'error',
        text: 'Please complete Beneficiary Legal Name, City/State/Postal Address, Active WhatsApp Number, and Verified Email.'
      });
      return;
    }

    if (globalSettlementRail === 'BANK_WIRE') {
      if (!globalBankName.trim() || !globalIbanOrAccount.trim() || !globalSwiftBic.trim()) {
        setPayoutFeedback({
          type: 'error',
          text: 'For International Bank Wire, please provide Bank Name, Account Number / IBAN, and SWIFT / BIC Code.'
        });
        return;
      }
    } else if (globalSettlementRail === 'CRYPTO_USDT') {
      if (!isValidUsdtWallet) {
        setPayoutFeedback({
          type: 'error',
          text:
            globalCryptoNetwork === 'USDT-TRC20'
              ? 'Invalid USDT-TRC20 wallet address. Must start with "T" and be 34 base58 characters.'
              : 'Invalid USDT-BEP20 wallet address. Must start with "0x" and be 42 hexadecimal characters.'
        });
        return;
      }
    } else if (globalSettlementRail === 'REGIONAL_WALLET') {
      if (!globalWalletProvider.trim() || !globalWalletAccountTag.trim()) {
        setPayoutFeedback({
          type: 'error',
          text: 'For Regional Wallet / Wise / PayPal, please provide Provider Name and Registered Email / Phone / Tag.'
        });
        return;
      }
    }

    if (!globalComplianceConfirmed) {
      setPayoutFeedback({
        type: 'error',
        text: 'Please check the compliance confirmation box to certify that your beneficiary details are 100% accurate.'
      });
      return;
    }

    const estUSD = Number((amount / GLOBAL_CURRENCIES.USD.rateToGHS).toFixed(2));
    const estEUR = Number((amount / GLOBAL_CURRENCIES.EUR.rateToGHS).toFixed(2));
    const estGBP = Number((amount / GLOBAL_CURRENCIES.GBP.rateToGHS).toFixed(2));

    const resolvedGlobalMethod =
      globalSettlementRail === 'BANK_WIRE'
        ? 'Bank Transfer'
        : globalSettlementRail === 'CRYPTO_USDT'
        ? 'USDT Crypto'
        : 'Regional Wallet';
    const resolvedGlobalAccount =
      globalSettlementRail === 'BANK_WIRE'
        ? globalIbanOrAccount.trim()
        : globalSettlementRail === 'CRYPTO_USDT'
        ? globalCryptoAddress.trim()
        : globalWalletAccountTag.trim();
    const resolvedGlobalBankOrNetwork =
      globalSettlementRail === 'BANK_WIRE'
        ? `${globalResidenceCountry} • ${globalBankName.trim()} (SWIFT: ${globalSwiftBic.trim()})`
        : globalSettlementRail === 'CRYPTO_USDT'
        ? `${globalResidenceCountry} • ${globalCryptoNetwork}`
        : `${globalResidenceCountry} • ${globalWalletProvider.trim()} (${globalWalletCurrency})`;

    setIsSubmittingPayout(true);
    try {
      const response = await authFetch('/api/pillar2/request-payout', {
        method: 'POST',
        body: JSON.stringify({
          amountGHS: amount,
          payoutMethod: resolvedGlobalMethod,
          accountName: globalBeneficiaryName.trim(),
          accountNumber: resolvedGlobalAccount,
          bankOrNetwork: resolvedGlobalBankOrNetwork,
          phone: `${globalWhatsappDialCode}${globalWhatsappPhone.replace(/^0+/, '').trim()}`,
          affiliateName: `${firstName} ${lastName}`.trim() || globalBeneficiaryName.trim(),
          affiliateEmail: globalVerifiedEmail.trim(),
        })
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok || !resData?.success) {
        setPayoutFeedback({
          type: 'error',
          text: resData?.error || 'Failed to submit Global Manual Settlement request.'
        });
        return;
      }

      if (typeof resData?.balance_after_ghs === 'number') {
        setAvailableBalanceGHS(resData.balance_after_ghs);
      } else {
        setAvailableBalanceGHS((prev) => Number(Math.max(0, prev - amount).toFixed(2)));
      }
      if (resData?.request) {
        setPayoutRequests((prev) => [resData.request, ...prev]);
      }
      setPayoutAmountGHS('');
      setPayoutFeedback({
        type: 'success',
        text: `🌍 Global Payout Request for GH₵ ${amount.toFixed(2)} (≈ $${estUSD.toFixed(
          2
        )} USD / €${estEUR.toFixed(2)} EUR / £${estGBP.toFixed(
          2
        )} GBP) submitted & Admin alerted! Track live status below.`
      });
      toast.success('Global payout request submitted & Admin notified!');
    } catch (_) {
      setPayoutFeedback({
        type: 'error',
        text: 'Could not dispatch international payout request. Please check your internet connection.'
      });
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // ============================================================================
  // BLOCK 2: LICENSE TIMER LOGIC & AUTOMATIC ADMIN ALERT
  // ============================================================================
  useEffect(() => {
    purgeLegacyAccessFlags();
  }, [userId]);

  useEffect(() => {
    if (!hasActivePaidLicense) {
      setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
      return;
    }
    if (!licenseExpiresAt || licenseExpiresAt <= Date.now()) {
      const recoveredMs = Date.now() + 365 * 24 * 60 * 60 * 1000;
      setLicenseExpiresAt(recoveredMs);
      if (!hasSyncedMissingExpiryRef.current) {
        hasSyncedMissingExpiryRef.current = true;
        authFetch('/api/pillar2/sync-license', { method: 'POST' })
          .then((r) => r.json())
          .then((syncJson) => {
            if (syncJson?.pillar2_expires_at) {
              setLicenseExpiresAt(new Date(syncJson.pillar2_expires_at).getTime());
            }
          })
          .catch(() => {});
      }
      return;
    }

    const computeTick = () => {
      const now = Date.now();
      const remainingMs = licenseExpiresAt - now;

      if (remainingMs <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });

        // Admin Kick-out Alert
        if (!expiryAlertSentRef.current) {
          expiryAlertSentRef.current = true;
          const sendAlert = async () => {
            try {
              await fetch('/api/affiliate/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'LICENSE_EXPIRED_KICKOUT_ALERT',
                  payload: {
                    subject: `🚨 [ADMIN CONTROL ALERT] Affiliate 1-Year License Expired — Kick Out & Require GH₵ 45 Renewal (${
                      currentProfile?.email || pillar2Email
                    })`,
                    message: `User: ${firstName} ${lastName}\nPaid Email: ${
                      currentProfile?.email || pillar2Email
                    }\nAffiliate ID: ${userAffiliateCode}\nPhone: ${pillar2Phone}\nStatus: User has been automatically locked out of Pillar 2 Affiliate Hub until they complete their GH₵ 45.00 annual renewal.`
                  }
                })
              });
            } catch (_) {}
          };
          sendAlert();
        }
      } else {
        const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
        setTimeRemaining({ days, hours, minutes, seconds, expired: false });
        expiryAlertSentRef.current = false;
      }
    };

    computeTick();
    const timer = setInterval(computeTick, 1000);
    return () => clearInterval(timer);
  }, [hasActivePaidLicense, licenseExpiresAt, firstName, lastName, currentProfile?.email, pillar2Email, userAffiliateCode, pillar2Phone]);

  // ============================================================================
  // STRICT USER-SCOPED LOCALSTORAGE PERSISTENCE (horpal_p2_state_v3_${userId})
  // ============================================================================
  useEffect(() => {
    try {
      localStorage.removeItem('horpal_p2_state_v3');
      localStorage.removeItem('horpal_p2_user_state_test_bypass_id');
      localStorage.removeItem('horpal_p2_license_test_bypass_id');
    } catch (_) {}

    // Clear state immediately when userId changes to prevent cross-account bleed
    // All financial & sales metrics are strictly hydrated from Supabase (profiles & pillar2_sales)
    setAvailableBalanceGHS(Number(currentProfile?.affiliate_balance ?? 0));
    setTotalEarningsGHS(Number(currentProfile?.affiliate_total_earned ?? 0));
    setWithdrawnBalanceGHS(Number(currentProfile?.affiliate_withdrawn ?? 0));
    setTotalSalesCount(Number(currentProfile?.affiliate_total_sales ?? 0));
    setTotalClicksCount(Number(currentProfile?.affiliate_link_clicks ?? 0));
    setTransactions([]);
    setWalletHistory([]);
    setUnlockedProductIds([]);
    setNotificationsList([]);
    setAbandonedLeads([]);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(
        `horpal_p2_state_v3_${userId}`,
        JSON.stringify({
          firstName,
          lastName,
          username,
          pillar2Email: currentProfile?.email || pillar2Email,
          pillar2Phone,
          pillar2Country,
          profile_completed: profileCompleted,
          walletHistory,
          unlockedProductIds,
          notificationsList,
          abandonedLeads
        })
      );
    } catch (_) {}
  }, [
    userId,
    firstName,
    lastName,
    username,
    currentProfile?.email,
    pillar2Email,
    pillar2Phone,
    pillar2Country,
    profileCompleted,
    availableBalanceGHS,
    totalEarningsGHS,
    withdrawnBalanceGHS,
    totalSalesCount,
    totalClicksCount,
    transactions,
    walletHistory,
    unlockedProductIds,
    notificationsList,
    abandonedLeads
  ]);

  // ============================================================================
  // SOCIAL PROOF EARNINGS FLYER GENERATOR (CANVAS PNG EXPORT)
  // ============================================================================
  const handleGenerateSocialProofFlyer = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
      grad.addColorStop(0, '#050814');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#042f2e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Emerald & Indigo radial highlights
      ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
      ctx.beginPath();
      ctx.arc(880, 200, 260, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(99, 102, 241, 0.16)';
      ctx.beginPath();
      ctx.arc(180, 880, 280, 0, Math.PI * 2);
      ctx.fill();

      // Gold/Emerald frame
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 6;
      ctx.strokeRect(48, 48, 984, 984);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 28px monospace';
      ctx.fillText('HORPAL PILLAR 2 • VERIFIED PARTNER EARNINGS', 540, 140);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 58px sans-serif';
      const displayHandle = username ? `@${username}` : `${firstName} ${lastName}`.trim() || 'HorPal Partner';
      ctx.fillText(displayHandle, 540, 240);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '26px monospace';
      ctx.fillText(`AFFILIATE CODE: ${userAffiliateCode}`, 540, 295);

      // Central payout card
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(140, 370, 800, 320);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2;
      ctx.strokeRect(140, 370, 800, 320);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('TOTAL VERIFIED PAYOUTS & COMMISSIONS', 540, 445);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 92px sans-serif';
      ctx.fillText(formatAmount(Math.max(totalEarningsGHS, availableBalanceGHS)), 540, 560);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(`${totalSalesCount} Verified Sales • Instant 50% Commission Split`, 540, 635);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('Start Earning 50% Commission Per Sale Today!', 540, 810);

      ctx.fillStyle = '#34d399';
      ctx.font = '26px monospace';
      ctx.fillText(`${appOrigin}/affiliate?ref=${userAffiliateCode}`, 540, 875);

      const dataUrl = canvas.toDataURL('image/png');
      setFlyerPreviewUrl(dataUrl);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `HorPal-SocialProof-${userAffiliateCode || 'Partner'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadSuccessBanner('✓ Official HorPal Social Proof Flyer downloaded!');
      setTimeout(() => setDownloadSuccessBanner(null), 4000);
    } catch (err) {
      console.error('Flyer generation failed:', err);
    }
  };

  // ============================================================================
  // PILLAR 2 HELP DESK CHAT HANDLER (SILENT & EMPTY — ZERO AUTOMATED REPLY)
  // ============================================================================
  const handleAiBotSend = (customPrompt?: string) => {
    const query = (customPrompt || aiInput).trim();
    if (!query) return;

    setAiMessages((prev) => [...prev, { sender: 'user', text: query }]);
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
      if (marketFilter === 'Under GH₵ 100') return p.priceGHS <= 100;
      return p.category === marketFilter;
    });
  }, [products, marketSearch, marketFilter]);

  const unreadNotifCount = notificationsList.filter((n) => !n.read).length;
  const userInitials = useMemo(() => {
    const fi = firstName.trim().charAt(0);
    const li = lastName.trim().charAt(0);
    if (fi && li) return `${fi}${li}`.toUpperCase();
    if (fi) return fi.slice(0, 2).toUpperCase();
    const uClean = username.replace(/^@+/, '').trim();
    if (uClean) return uClean.slice(0, 2).toUpperCase();
    const eClean = (currentProfile?.email || pillar2Email || '').trim();
    if (eClean) return eClean.slice(0, 2).toUpperCase();
    return 'HP';
  }, [firstName, lastName, username, currentProfile?.email, pillar2Email]);

  const isAdminUser = useMemo(() => {
    const activeMail = (currentProfile?.email || pillar2Email || '').trim().toLowerCase();
    return [
      'horpalservice@gmail.com',
      'earnmegaservice@gmail.com',
      'geestablish@gmail.com',
    ].includes(activeMail);
  }, [currentProfile?.email, pillar2Email]);

  const handlePillar2SignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out of Supabase:', err);
    }
    try {
      purgeLegacyAccessFlags();
      localStorage.removeItem('horpal_p2_state_v3');
      if (userId) {
        localStorage.removeItem(`horpal_p2_state_v3_${userId}`);
        localStorage.removeItem(`horpal_p2_user_state_${userId}`);
      }
    } catch (_) {}
    window.location.href = '/';
  };


  // Milestone Progress Math
  const milestoneTiers = [
    { name: 'Starter', min: 0, max: 999, label: 'Starter' },
    { name: 'Bronze Excellence', min: 1000, max: 4999, label: 'Bronze Excellence' },
    { name: 'Silver Executive', min: 5000, max: 9999, label: 'Silver Executive' },
    { name: 'Gold Partner', min: 10000, max: 24999, label: 'Gold Partner' },
    { name: 'Diamond Ambassador', min: 25000, max: Infinity, label: 'Diamond Ambassador' }
  ];
  const reversedTiers = [...milestoneTiers].reverse();
  const currentTier = reversedTiers.find(t => totalEarningsGHS >= t.min) || milestoneTiers[0];
  const nextTier = milestoneTiers[milestoneTiers.indexOf(currentTier) + 1] || currentTier;
  const milestoneGoalGHS = nextTier.min || currentTier.max;
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
              onClick={() => {
                const isAuthorizedPillar2User = hasPillar2Access(currentProfile);
                if (!isAuthorizedPillar2User) {
                  setIsLockedDashboardModalOpen(true);
                  return;
                }
                setActiveSalesPageProduct(null);
                if (isMandatoryProfileCompletion) {
                  setActiveSettingsModal('pillar2_onboarding');
                }
              }}
              className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold px-3.5 py-1.5 rounded-lg shadow-md transition-all"
            >
              Enter Affiliate Dashboard
            </button>
          </div>
        </div>

        {isLockedDashboardModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="bg-[#0d1322] border border-amber-500/40 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto text-2xl">
                🔒
              </div>
              <h3 className="text-lg md:text-xl font-black text-white">
                🔒 Affiliate Hub Locked
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                🔒 Affiliate Hub Locked — Complete your product purchase below (which includes free Affiliate Hub access!) OR pay the GH₵ 90.00 Affiliate Registration Fee to enter the Dashboard.
              </p>
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    setIsLockedDashboardModalOpen(false);
                    setIsDirectEnrollmentCheckout(false);
                    setCheckoutStep(1);
                  }}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm transition-all"
                >
                  Complete Product Purchase Below (Includes Free Affiliate Access)
                </button>
                <button
                  onClick={() => {
                    setIsLockedDashboardModalOpen(false);
                    try {
                      sessionStorage.removeItem('horpal_active_prod');
                    } catch (_) {}
                    window.location.href = '/affiliate';
                  }}
                  className="w-full py-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs transition-all"
                >
                  Pay GH₵ 90.00 Affiliate Registration Fee
                </button>
                <button
                  onClick={() => setIsLockedDashboardModalOpen(false)}
                  className="w-full py-2 text-xs text-gray-400 hover:text-white"
                >
                  Stay on Product Page
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-[#0d1322] border border-emerald-500/30 rounded-3xl p-6 md:p-10 shadow-2xl group">
            {/* Glowing HD AI Product Cover Header */}
            <div className="h-48 sm:h-64 w-full rounded-2xl overflow-hidden relative mb-6 border border-white/10 shadow-2xl">
              <div
                className={`absolute -inset-2 bg-gradient-to-r ${p.glowColor || 'from-emerald-500 via-teal-500 to-cyan-500'} blur-2xl opacity-60 group-hover:opacity-95 transition-all duration-500 pointer-events-none`}
              />
              <img
                src={p.imageUrl}
                alt={p.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getProductSvgFallback(p.title, p.shortCode);
                }}
                className="relative z-10 object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-xs font-black text-white shadow-lg">
                {formatAmount(p.priceGHS)}
              </div>
              <div className="absolute bottom-3 left-3 z-20 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md border border-emerald-300/50 text-[11px] font-black text-black shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                50% COMMISSION → {formatAmount(p.priceGHS * 0.5)}
              </div>
            </div>

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
              onClick={() => {
                purgeLegacyAccessFlags();
                window.location.href = "/";
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-xs transition-all"
            >
              ← Hub
            </button>
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
                  <button
                    onClick={() => {
                      purgeLegacyAccessFlags();
                      window.location.href = "/";
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-xs transition-all mr-2"
                  >
                    ← Hub
                  </button>
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
                    { id: 'exam', label: '5-Step Exam & Certificate', icon: Award },
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
                    { id: 'my_courses', label: 'My Unlocked Courses', icon: Folder },
                    { id: 'links', label: 'Link Manager & Shortener', icon: Share2 },
                    { id: 'ai_tools', label: 'WhatsApp Closer & Bio-Link', icon: Zap },
                    { id: 'vault', label: 'TikTok & WhatsApp Swipe Vault', icon: MessageSquare },
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
                    { id: 'creator', label: 'Creator Whitelist Requirements Site', icon: Briefcase },
                    { id: 'rules', label: 'Official Rules & Regulations Site', icon: ShieldCheck },
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
                onClick={handlePillar2SignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out / Sign Out</span>
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
        {downloadSuccessBanner && (
          <div className="mb-4 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between">
            <span>{downloadSuccessBanner}</span>
            <button onClick={() => setDownloadSuccessBanner(null)}>✕</button>
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
                  Welcome back, {username ? `@${username}` : firstName || 'Partner'} 👋
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

            {/* Sleek Emerald Annual Affiliate License Active Badge (Hides Renewal Until 1 Year Ends) */}
            {!timeRemaining.expired ? (
              (() => {
                const isZeroClock =
                  timeRemaining.days === 0 &&
                  timeRemaining.hours === 0 &&
                  timeRemaining.minutes === 0 &&
                  timeRemaining.seconds === 0;
                const displayDays = isZeroClock ? 364 : timeRemaining.days;
                const displayHours = isZeroClock ? 23 : timeRemaining.hours;
                const displayMinutes = isZeroClock ? 59 : timeRemaining.minutes;
                const displaySeconds = isZeroClock ? 59 : timeRemaining.seconds;
                const validUntilDate =
                  licenseExpiresAt > Date.now()
                    ? new Date(licenseExpiresAt)
                    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
                return (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_25px_rgba(16,185,129,0.12)]">
                    <div className="flex items-center gap-2 text-xs md:text-sm font-black text-emerald-300">
                      <span>
                        ✅ Annual Affiliate License Active • [
                        {displayDays}d {String(displayHours).padStart(2, '0')}h{' '}
                        {String(displayMinutes).padStart(2, '0')}m{' '}
                        {String(displaySeconds).padStart(2, '0')}s] Remaining
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-400/80 font-mono">
                      Valid Until: {validUntilDate.toLocaleDateString()}
                    </span>
                  </div>
                );
              })()
            ) : (
              <div className="bg-rose-950/40 border border-rose-500/50 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-rose-300">
                  <span>🔴 Annual Affiliate License Expired (00:00:00 Remaining)</span>
                  <button
                    onClick={() => setIsRenewalModalOpen(true)}
                    className="text-emerald-300 hover:text-emerald-200 underline font-black transition-all ml-2"
                  >
                    Renew Annual License — GH₵ 45.00 (50% Discount)
                  </button>
                </div>
              </div>
            )}

            {/* Live Active Payout Status Banner (Shown whenever a payout request is pending or processing) */}
            {(() => {
              const activePayout = payoutRequests.find(
                (r) => r.status === 'processing' || r.status === 'pending'
              );
              if (!activePayout) return null;
              const isProcessing = activePayout.status === 'processing';
              return (
                <div
                  className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg ${
                    isProcessing
                      ? 'bg-sky-950/50 border-sky-500/50 shadow-[0_0_25px_rgba(14,165,233,0.18)]'
                      : 'bg-amber-950/40 border-amber-500/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isProcessing ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                            isProcessing
                              ? 'bg-sky-500/25 text-sky-200 animate-pulse border border-sky-400/40'
                              : 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                          }`}
                        >
                          {isProcessing
                            ? '🔵 Processing... (Transfer Initiated by Admin)'
                            : '🟡 Pending Review'}
                        </span>
                        <span className="text-sm font-black text-white">
                          GH₵ {Number(activePayout.amount_ghs || 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-300">
                          • {activePayout.payout_method} ({activePayout.account_number})
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mt-1">
                        {activePayout.admin_status_note || 'Awaiting Admin review'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('payouts')}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black whitespace-nowrap transition-all"
                  >
                    Track in Payouts →
                  </button>
                </div>
              );
            })()}

            {/* Affiliate Milestone Progress Bar (Digitstem Style) */}
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  AFFILIATE MILESTONE PROGRESS
                </span>
                <span className="text-xs font-bold bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                  🚀 {currentTier.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-2xl">
                  🚀
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{currentTier.label}</h3>
                  <p className="text-xs text-gray-400">Next: {nextTier.label}</p>
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

            {/* Purple/Indigo Available Commission Balance Card (Digitstem Style) */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-3xl p-6 shadow-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-100 block">
                AVAILABLE COMMISSION
              </span>
              <div className="text-3xl md:text-4xl font-black text-white mt-1 mb-2">
                {formatAmount(availableBalanceGHS)}
              </div>
              <p className="text-xs text-indigo-100 mb-5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Payout ready • Settles in GH₵ ({availableBalanceGHS.toFixed(2)} GHS)</span>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setIsDepositModalOpen(true)}
                  className="py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-amber-500/20"
                >
                  + Deposit Funds 💳
                </button>
                <button
                  onClick={() => setActiveSection('marketplace')}
                  className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all"
                >
                  Promote Products
                </button>
                <button
                  onClick={() => setActiveSection('payouts')}
                  className="py-3 col-span-2 md:col-span-1 rounded-xl bg-white hover:bg-gray-100 text-indigo-950 font-black text-xs transition-all"
                >
                  Pay Out Now
                </button>
              </div>
            </div>

            {/* 4 Key Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div onClick={() => setActiveSection("ledger")} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 transition-all">
                <span className="text-xs text-gray-400 block">Total Historical</span>
                <span className="text-xl font-black text-white mt-1 block">
                  {formatAmount(totalEarningsGHS)}
                </span>
                <span className="text-[11px] text-emerald-400 mt-1 block">↑ Instant 50% Split</span>
              </div>
              <div onClick={() => setActiveSection("ledger")} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 transition-all">
                <span className="text-xs text-gray-400 block">Total Sales</span>
                <span className="text-xl font-black text-white mt-1 block">{totalSalesCount}</span>
                <span className="text-[11px] text-indigo-400 mt-1 block">Verified Paystack</span>
              </div>
              <div onClick={() => setActiveSection("payouts")} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 transition-all">
                <span className="text-xs text-gray-400 block">Withdrawn Earnings</span>
                <span className="text-xl font-black text-white mt-1 block">
                  {formatAmount(withdrawnBalanceGHS)}
                </span>
                <span className="text-[11px] text-gray-400 mt-1 block">↓ Friday Transfers</span>
              </div>
              <div onClick={() => setActiveSection("links")} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 transition-all">
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
                  { label: 'Marketplace', sub: `${products.length} Verified Offers`, icon: ShoppingBag, target: 'marketplace', color: 'text-emerald-400' },
                  { label: 'Link Shortener', sub: 'Unique Links & QR', icon: Share2, target: 'links', color: 'text-indigo-400' },
                  { label: 'Withdraw Funds', sub: 'Friday Payout Desk', icon: DollarSign, target: 'payouts', color: 'text-rose-400' },
                  { label: 'Help / Support', sub: '24/7 Agent Desk', icon: HelpCircle, target: 'support', color: 'text-sky-400' },
                ].map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSection(action.target as any)}
                    className="flex flex-col items-center justify-center p-4 bg-[#141d30] border border-white/5 rounded-2xl hover:bg-[#1b263f] hover:border-white/10 transition-all text-center group"
                  >
                    <div className={`w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform ${action.color}`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-white mb-0.5">{action.label}</span>
                    <span className="text-[10px] text-gray-500">{action.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* RECENT CONVERSIONS (REAL-TIME 50% PAYOUT LEDGER) */}
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Recent Conversions (50% Commission Ledger)</span>
                </h3>
                <button
                  onClick={() => setActiveSection('ledger')}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
                >
                  View Full Ledger →
                </button>
              </div>
              {transactions.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">
                  No verified conversions yet. Share your unique product link to earn an instant 50% commission on every sale.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {transactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 bg-[#141d30] border border-white/5 rounded-2xl px-4 py-3"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {tx.productTitle}
                        </span>
                        <span className="text-[11px] text-gray-400 block truncate">
                          {tx.buyerName} ({tx.buyerEmail || 'Verified Buyer'}) • {tx.date}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-emerald-400 block">
                          +{formatAmount(tx.commissionGHS)}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-300/80 uppercase">
                          50% Credited
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 2: MARKETPLACE */}
        {/* ================================================================== */}
        {activeSection === "marketplace" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-black text-white">Affiliate Marketplace</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                  className="px-4 py-2 bg-[#141d30] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
                <select
                  value={marketFilter}
                  onChange={(e) => setMarketFilter(e.target.value)}
                  className="px-4 py-2 bg-[#141d30] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {["All Offers", "Top Pick", "High Converting", "Under GH₵ 100", "AI & Tech", "Sales", "Trading & Finance"].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredMarketplaceProducts.map((p) => (
                <div key={p.id} className="bg-[#0f172a] border border-white/10 rounded-3xl p-5 hover:border-emerald-500/50 transition-all flex flex-col h-full group relative overflow-hidden">
                  {/* Glowing HD AI Cover Header */}
                  <div className="h-48 w-full rounded-2xl overflow-hidden relative mb-4 border border-white/10 shadow-2xl">
                    <div
                      className={`absolute -inset-2 bg-gradient-to-r ${p.glowColor || 'from-emerald-500 via-teal-500 to-cyan-500'} blur-2xl opacity-60 group-hover:opacity-95 transition-all duration-500 pointer-events-none`}
                    />
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getProductSvgFallback(p.title, p.shortCode);
                      }}
                      className="relative z-10 object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-xs font-black text-white shadow-lg">
                      {formatAmount(p.priceGHS)}
                    </div>
                    <div className="absolute bottom-3 left-3 z-20 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md border border-emerald-300/50 text-[11px] font-black text-black shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                      50% COMMISSION → {formatAmount(p.priceGHS * 0.5)}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                    {p.badges.map((badge, idx) => (
                      <span key={idx} className={`text-[10px] font-black px-2 py-1 rounded-md ${
                        badge.includes('TOP PICK') ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        badge.includes('HIGH CONVERTING') ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        'bg-white/10 text-gray-300 border border-white/10'
                      }`}>
                        {badge.includes('TOP PICK') && '★ '}
                        {badge.includes('HIGH CONVERTING') && '🔥 '}
                        {badge}
                      </span>
                    ))}
                    <span className="text-[10px] font-black px-2 py-1 rounded-md bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                      {p.rating} ★
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white leading-tight mb-1 relative z-10">{p.title}</h3>
                  <span className="text-xs text-gray-400 mb-6 block relative z-10">By <span className="text-emerald-400 font-mono font-medium">{p.creator}</span></span>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                    <div className="bg-[#141d30] rounded-xl p-3 border border-white/5">
                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Price</span>
                      <span className="text-sm font-black text-white">{formatAmount(p.priceGHS)}</span>
                    </div>
                    <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-500 uppercase font-bold block mb-1">{p.commissionPercent}% Commission</span>
                      <span className="text-sm font-black text-emerald-400">{formatAmount(p.priceGHS * (p.commissionPercent / 100))}</span>
                    </div>
                    <div className="bg-[#141d30] rounded-xl p-3 border border-white/5">
                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Est. EPC</span>
                      <span className="text-sm font-bold text-gray-300">{p.epc || `$${p.epcUSD.toFixed(2)}`}</span>
                    </div>
                    <div className="bg-[#141d30] rounded-xl p-3 border border-white/5">
                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Conv. Rate</span>
                      <span className="text-sm font-bold text-gray-300">{p.conversionRate || p.avgConvRate}</span>
                    </div>
                  </div>

                  {/* Affiliate Link Input */}
                  <div className="mb-6 relative z-10">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Your Unique Link</label>
                    <div className="flex bg-[#141d30] border border-white/10 rounded-xl overflow-hidden">
                      <input
                        type="text"
                        readOnly
                        value={getUniqueProductAffiliateLink(p)}
                        className="flex-1 bg-transparent px-3 py-2.5 text-xs text-gray-300 font-mono outline-none"
                      />
                      <button
                        onClick={() => handleCopy(getUniqueProductAffiliateLink(p), p.id)}
                        className={`px-4 flex items-center justify-center transition-colors border-l border-white/10 ${copiedKey === p.id ? 'bg-emerald-500 text-black' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                      >
                        {copiedKey === p.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 3 Action Buttons */}
                  <div className="mt-auto space-y-2 relative z-10">
                    <button onClick={() => setPromoteModalProduct(p)} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)]">
                      Promote Studio 🚀
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setActiveSalesPageProduct(p)} className="py-2.5 rounded-xl bg-[#141d30] hover:bg-[#1b263f] border border-white/10 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Sales Page
                      </button>
                      <button
                        onClick={() => {
                          if (unlockedProductIds.includes(p.id)) {
                            window.open(p.deliveryUrl, '_blank', 'noopener,noreferrer');
                          } else {
                            openDigitstemCheckoutForProduct(p);
                          }
                        }}
                        className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center gap-1.5"
                      >
                        {unlockedProductIds.includes(p.id) ? <Folder className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                        {unlockedProductIds.includes(p.id) ? 'Open Drive' : 'Checkout'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 3: LINKS & QR MANAGER */}
        {/* ================================================================== */}
        {activeSection === "links" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Link Manager & Traffic Tagging</h2>
                <p className="text-sm text-gray-400">Generate unique tracking links, add Sub-IDs, and download QR codes.</p>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6">
               <div className="space-y-6">
                 {products.map(p => {
                    const baseLink = getUniqueProductAffiliateLink(p);
                    const tagId = `tag-${p.id}`;
                    const tagVal = linkTags[tagId] || '';
                    const finalLink = tagVal ? `${baseLink}&sub=${encodeURIComponent(tagVal)}` : baseLink;

                    return (
                      <div key={p.id} className="p-5 bg-[#141d30] border border-white/5 hover:border-indigo-500/30 rounded-2xl transition-all">
                        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                          <div>
                            <span className="text-sm font-black text-white block mb-1">{p.title}</span>
                            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Auto-tracked to {userAffiliateCode}
                            </span>
                          </div>
                          <button onClick={() => setPromoteModalProduct(p)} className="self-start text-xs font-bold bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20">
                            Open Promote Studio
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3 mb-3">
                           <div className="flex bg-[#0b111e] border border-white/10 rounded-xl overflow-hidden">
                             <input
                               type="text"
                               readOnly
                               value={finalLink}
                               className="flex-1 bg-transparent px-3 py-2.5 text-xs text-gray-300 font-mono outline-none"
                             />
                             <button
                               onClick={() => handleCopy(finalLink, p.id)}
                               className={`px-4 flex items-center justify-center transition-colors border-l border-white/10 ${copiedKey === p.id ? 'bg-indigo-500 text-white' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                             >
                               {copiedKey === p.id ? 'Copied!' : <Copy className="w-4 h-4" />}
                             </button>
                           </div>
                           <input
                             type="text"
                             placeholder="Sub-ID Tag (e.g. tiktok_bio)"
                             value={tagVal}
                             onChange={(e) => setLinkTags(prev => ({...prev, [tagId]: e.target.value}))}
                             className="w-full bg-[#0b111e] border border-white/10 px-3 py-2.5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
                           />
                        </div>
                      </div>
                    )
                 })}
               </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 4: SWIPE VAULT */}
        {/* ================================================================== */}
        {activeSection === "vault" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Promotional Swipe Vault</h2>
                <p className="text-sm text-gray-400">High-converting copy for WhatsApp, TikTok & IG.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {products.map(p => (
                <div key={p.id} className="bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden group">
                  <div className="bg-[#141d30] px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-emerald-400">{p.title} Scripts</h3>
                    <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md">Tested & Proven</span>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* TikTok/IG */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2"><Video className="w-3.5 h-3.5" /> TikTok / Reels Hook</span>
                        <button onClick={() => handleCopy(p.swipeCopy.tiktok[0], `tk-${p.id}`)} className="text-[10px] font-bold text-gray-400 hover:text-white flex items-center gap-1">
                          {copiedKey === `tk-${p.id}` ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy
                        </button>
                      </div>
                      <div className="p-4 bg-[#0b111e] rounded-xl border border-white/5 relative">
                        <p className="text-sm text-gray-300 italic">"{p.swipeCopy.tiktok[0]}"</p>
                      </div>
                    </div>
                    {/* WhatsApp */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#25D366] flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp Status / DM</span>
                        <button
                          onClick={() => handleCopy(p.swipeCopy.whatsapp[0].replace("{LINK}", getUniqueProductAffiliateLink(p)), `wa-${p.id}`)}
                          className="text-[10px] font-bold text-gray-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedKey === `wa-${p.id}` ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy
                        </button>
                      </div>
                      <div className="p-4 bg-[#0b111e] rounded-xl border border-white/5">
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">
                          {p.swipeCopy.whatsapp[0].replace("{LINK}", getUniqueProductAffiliateLink(p))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 5: EXAM & CERTIFICATION */}
        {/* ================================================================== */}
        {activeSection === "exam" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Certification Academy</h2>
                <p className="text-sm text-gray-400">Pass the 5-Step Exam (90% required) to earn your Official Certificate.</p>
              </div>
            </div>

            {/* Top Product Selector */}
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Select Certification Course</label>
                <select
                  value={examProductId}
                  onChange={(e) => {
                    setExamProductId(e.target.value);
                    setCurrentExamStep(1);
                    setUnlockedExamStep(1);
                    setExamAnswers({});
                    setExamStepResult(null);
                    if (passedCourseCertificates[e.target.value]) {
                      setCertificateCode(passedCourseCertificates[e.target.value]);
                      setCertificateUnlocked(true);
                    } else {
                      setCertificateCode('');
                      setCertificateUnlocked(false);
                    }
                  }}
                  className="bg-[#141d30] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none min-w-[250px]"
                >
                  {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

            </div>

            {certificateUnlocked ? (
              // Official Certificate View
              <div className="bg-[#060A14] border-2 border-amber-400/80 rounded-3xl p-8 md:p-16 text-center relative overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)]">
                <div className="absolute inset-0 border-[4px] border-amber-500/30 m-3 pointer-events-none rounded-2xl"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>

                <div className="flex justify-center mb-6 relative z-10">
                  <div className="w-16 h-16 bg-amber-500/10 rounded-full border-2 border-amber-500/50 flex items-center justify-center">
                    <Award className="w-8 h-8 text-amber-400" />
                  </div>
                </div>

                <h1 className="text-3xl md:text-5xl font-serif text-amber-400 mb-2 relative z-10 font-bold uppercase tracking-widest">HorPal Executive Academy</h1>
                <p className="text-gray-400 uppercase tracking-[0.2em] text-xs md:text-sm mb-10 relative z-10 font-medium">Official Charter of Digital & Affiliate Mastery</p>

                <p className="text-gray-400 mb-4 relative z-10 text-sm tracking-widest uppercase">This proudly certifies that</p>
                <div className="relative inline-block mb-10 z-10">
                  <input
                    type="text"
                    value={certificateStudentName.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())}
                    onChange={(e) => setCertificateStudentName(e.target.value)}
                    className="text-4xl md:text-6xl font-serif italic font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 text-center focus:outline-none w-full max-w-2xl px-8 pb-2"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-70"></div>
                </div>

                <p className="text-gray-400 mb-2 relative z-10 text-sm md:text-base">has successfully mastered all 5 rigorous examination modules with</p>
                <p className="text-gray-400 mb-6 relative z-10 text-sm md:text-base">Distinction (90%+ Standard) in</p>

                <h2 className="text-2xl md:text-4xl font-bold text-emerald-400 mb-12 relative z-10 drop-shadow-md">
                  {products.find(p => p.id === examProductId)?.title || "Digital Marketing Academy"}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-16 relative z-10 text-left px-8">
                  <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="text-sm text-gray-300">Attribution & Funnel Architecture</span>
                  </div>
                  <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="text-sm text-gray-300">High-Converting Traffic Engineering</span>
                  </div>
                  <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="text-sm text-gray-300">WhatsApp & Social Closing Mastery</span>
                  </div>
                  <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="text-sm text-gray-300">Ethical Governance & Compliance</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 max-w-4xl mx-auto relative z-10 px-8">
                  {/* Left: Signature */}
                  <div className="text-center w-48">
                    <div className="border-b-2 border-gray-600 pb-2 mb-2">
                      <span className="font-serif italic text-3xl text-amber-200 block -mb-1">Gerald</span>
                    </div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Gerald • Founder & CEO, HorPal</p>
                  </div>

                  {/* Center: 3D Gold Seal */}
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] border-2 border-amber-200 flex items-center justify-center">
                       <div className="w-28 h-28 border border-amber-900/30 rounded-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-amber-400 to-amber-600">
                         <span className="text-[10px] font-black text-amber-950 uppercase tracking-widest block mb-0.5">100% Verified</span>
                         <span className="text-xs font-black text-amber-950 uppercase tracking-widest block mb-1">Distinction</span>
                         <span className="text-[8px] font-bold text-amber-900 uppercase tracking-widest">Seal • HorPal</span>
                       </div>
                    </div>
                  </div>

                  {/* Right: QR Code & Metadata */}
                  <div className="text-center md:text-right flex flex-col items-center md:items-end w-48">
                    <div className="w-20 h-20 bg-white p-1 rounded mb-2">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent('https://www.horpal.com/affiliate?verify=' + (certificateCode || 'HP-CERT'))}`}
                        alt="Verification QR"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Date Issued: {new Date().toLocaleDateString()}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Credential ID: {certificateCode || `HP-CERT-${Math.floor(100000 + Math.random() * 900000)}`}</p>
                  </div>
                </div>

                <div className="mt-16 flex flex-col sm:flex-row justify-center gap-4 relative z-10">
                  <button onClick={handleDownloadCertificate} className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                    <Download className="w-4 h-4" /> Download / Print Official Certificate
                  </button>
                  <button onClick={() => window.location.href = "mailto:horpalservice@gmail.com?subject=Certificate%20Verification"} className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center gap-2 border border-white/10">
                    <Upload className="w-4 h-4" /> Submit Proof to Admin
                  </button>
                </div>
              </div>
            ) : (
              // 5-Step Stepper & Questions Engine
              <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 md:p-8">
                {/* Stepper Progress */}
                <div className="flex justify-between items-center mb-8 relative">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 z-0"></div>
                  <div className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all" style={{ width: `${(currentExamStep - 1) * 25}%` }}></div>

                  {[1, 2, 3, 4, 5].map(step => (
                    <button
                      key={step}
                      disabled={step > unlockedExamStep}
                      onClick={() => {
                        setCurrentExamStep(step as any);
                        setExamAnswers({});
                        setExamStepResult(null);
                      }}
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all border-4 border-[#0f172a] ${
                        step === currentExamStep ? 'bg-emerald-500 text-black scale-110 shadow-[0_0_15px_rgba(16,185,129,0.5)]' :
                        step < currentExamStep ? 'bg-emerald-400 text-black' :
                        step <= unlockedExamStep ? 'bg-[#141d30] text-emerald-400 border-emerald-500/30' :
                        'bg-[#141d30] text-gray-600 border-white/5 cursor-not-allowed'
                      }`}
                    >
                      {step < currentExamStep ? <CheckCircle2 className="w-5 h-5" /> : step <= unlockedExamStep ? step : <Lock className="w-4 h-4" />}
                    </button>
                  ))}
                </div>

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-black text-emerald-400 mb-2">{FIVE_STEP_EXAM_BANK[currentExamStep].title}</h3>
                  <p className="text-sm text-gray-400">{FIVE_STEP_EXAM_BANK[currentExamStep].subtitle}</p>
                </div>

                {examStepResult && (
                  <div className={`p-6 rounded-2xl border mb-8 text-center ${examStepResult.passed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                    <h4 className="text-xl font-black mb-2">
                      {examStepResult.passed ? '🎉 Step Passed!' : '❌ Score Below 90%'}
                    </h4>
                    <p className="text-sm font-bold mb-1">Score: {examStepResult.correctCount}/{examStepResult.total} — {examStepResult.scorePercent}%</p>
                    {!examStepResult.passed ? (
                      <p className="text-xs opacity-80 mt-2">You must score 90% or higher to unlock the next step. Please review and retake.</p>
                    ) : currentExamStep === 5 ? (
                      <p className="text-xs opacity-80 mt-2">Congratulations! You have passed all 5 steps and unlocked your certificate!</p>
                    ) : (
                      <p className="text-xs opacity-80 mt-2">Excellent! You may now proceed to Step {currentExamStep + 1}.</p>
                    )}
                  </div>
                )}

                <form onSubmit={handleGradeExamStep} className="space-y-8">
                  {FIVE_STEP_EXAM_BANK[currentExamStep].questions.map((q, idx) => (
                    <div key={idx} className="bg-[#141d30] p-5 rounded-2xl border border-white/5">
                      <p className="font-bold text-white mb-4 text-sm md:text-base"><span className="text-emerald-400 mr-2">{idx + 1}.</span>{q.q}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                          <label
                            key={optIdx}
                            className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                              examAnswers[idx] === optIdx
                                ? 'bg-emerald-500/10 border-emerald-500/50'
                                : 'bg-[#0b111e] border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                              examAnswers[idx] === optIdx ? 'border-emerald-500 bg-emerald-500' : 'border-gray-600'
                            }`}>
                              {examAnswers[idx] === optIdx && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </div>
                            <span className={`text-sm ${examAnswers[idx] === optIdx ? 'text-emerald-300 font-medium' : 'text-gray-300'}`}>{opt}</span>
                            <input
                              type="radio"
                              name={`q-${currentExamStep}-${idx}`}
                              className="hidden"
                              checked={examAnswers[idx] === optIdx}
                              onChange={() => {
                                setExamAnswers(prev => ({...prev, [idx]: optIdx}));
                                setExamStepResult(null); // Clear result on new answer
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {!examStepResult?.passed && (
                     <button
                       type="submit"
                       disabled={Object.keys(examAnswers).length < 10}
                       className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-black transition-all text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                     >
                       {examStepResult ? 'Retake Step' : `Submit Step ${currentExamStep} Answers for Instant Grading`}
                     </button>
                  )}
                  {examStepResult?.passed && currentExamStep < 5 && (
                     <button
                       type="button"
                       onClick={() => {
                         setCurrentExamStep((currentExamStep + 1) as any);
                         setExamAnswers({});
                         setExamStepResult(null);
                       }}
                       className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black transition-all text-lg shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                     >
                       Proceed to Step {currentExamStep + 1} →
                     </button>
                  )}
                  {examStepResult?.passed && currentExamStep === 5 && (
                     <button
                       type="button"
                       onClick={() => setCertificateUnlocked(true)}
                       className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition-all text-lg shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
                     >
                       <Award className="w-5 h-5" /> Claim Official HorPal Certificate
                     </button>
                  )}
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 6: CONTESTS ARENA (4K BANNERS, LIVE SALES & ADMIN STATUS) */}
        {/* ================================================================== */}
        {activeSection === "contests" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-white">Contests Arena</h2>
                  <p className="text-xs md:text-sm text-gray-400">
                    100% Verified Paystack Sales & Live Admin Review Tracker • Win Cash, MacBook Pro M3 & Weekly Pools
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadSupabaseData()}
                className="px-4 py-2 rounded-xl bg-[#141d30] hover:bg-[#1b2742] border border-white/10 text-xs font-bold text-gray-200 flex items-center gap-2 self-start sm:self-auto"
              >
                <RefreshCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sync Live Sales & Status</span>
              </button>
            </div>

            {contestStatusBanner && (
              <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 p-4 rounded-2xl text-sm font-bold flex justify-between items-center gap-3">
                <span>{contestStatusBanner}</span>
                <button type="button" onClick={() => setContestStatusBanner(null)} className="shrink-0">
                  <X className="w-4 h-4"/>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                {
                  id: 'viral_100k' as const,
                  tag: 'VIRAL CREATOR BOUNTY',
                  title: 'TikTok & IG 100K Views Challenge',
                  description: 'Post a promotional HorPal video on TikTok or Instagram Reels. Hit 100,000 organic views with your unique link in bio to claim GH₵ 10,000!',
                  image: '/images/contests/contest_100k_views.jpg',
                  prizeLabel: 'Grand Cash Bounty',
                  prizeDisplay: formatAmount(10000),
                  accentBorder: 'border-cyan-500/35 shadow-[0_0_35px_rgba(6,182,212,0.12)]',
                  badgeStyle: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300',
                  prizeTextColor: 'text-cyan-300',
                  buttonStyle: 'bg-cyan-500 hover:bg-cyan-400 text-black',
                  buttonText: 'Register & Submit 100K Video Link',
                  showProgress: false,
                  currentCount: 0,
                  targetCount: 0,
                  progressLabel: '',
                  barColor: 'from-cyan-500 to-blue-500',
                  rules: [
                    'Video must clearly showcase HorPal Pillar 2 products or affiliate dashboard results (no misleading claims).',
                    'Your active affiliate link or unique Affiliate Code must be pinned in bio / caption.',
                    'Views must hit 100,000+ organic views verified via public TikTok / Instagram Reel URL.',
                    'Submit your public video URL & social handle via the button below for Admin review.',
                  ],
                },
                {
                  id: 'sales_50' as const,
                  tag: 'VELOCITY SPRINT',
                  title: '50-Sales Executive Sprint',
                  description: 'Achieve 50 verified Paystack product sales to unlock GH₵ 3,500 cash bonus + Executive Trophy recognition.',
                  image: '/images/contests/contest_50_sales.jpg',
                  prizeLabel: 'Executive Bonus',
                  prizeDisplay: formatAmount(3500),
                  accentBorder: 'border-amber-500/35 shadow-[0_0_35px_rgba(245,158,11,0.12)]',
                  badgeStyle: 'bg-amber-500/20 border-amber-400/50 text-amber-300',
                  prizeTextColor: 'text-amber-300',
                  buttonStyle: 'bg-amber-500 hover:bg-amber-400 text-black',
                  buttonText: totalSalesCount >= 50 ? '🏆 Claim GH₵ 3,500 Sprint Prize' : 'Register for 50-Sales Sprint',
                  showProgress: true,
                  currentCount: totalSalesCount,
                  targetCount: 50,
                  progressLabel: `${totalSalesCount} / 50 Sales`,
                  barColor: 'from-amber-600 to-amber-400',
                  rules: [
                    'Tracked 100% automatically via verified Paystack transactions in Supabase (profiles.affiliate_total_sales).',
                    'Zero self-referrals, zero test transactions, and zero duplicate buyer refunds permitted.',
                    'Register your participation or submit your prize claim once your counter hits 50 / 50 Sales.',
                    'Admin verifies settled Paystack receipts before marking your entry Approved Winner.',
                  ],
                },
                {
                  id: 'sales_100' as const,
                  tag: 'GRAND PRODUCER',
                  title: '100-Sales Grand Producer Challenge',
                  description: 'Reach 100 verified Paystack product sales to win a brand-new Space Black MacBook Pro M3 + GH₵ 10,000.00 cash reward.',
                  image: '/images/contests/contest_100_sales_macbook.jpg',
                  prizeLabel: 'Hardware + Cash Prize',
                  prizeDisplay: `MacBook Pro M3 + ${formatAmount(10000)}`,
                  accentBorder: 'border-emerald-500/35 shadow-[0_0_35px_rgba(16,185,129,0.12)]',
                  badgeStyle: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300',
                  prizeTextColor: 'text-emerald-300',
                  buttonStyle: 'bg-emerald-500 hover:bg-emerald-400 text-black',
                  buttonText: totalSalesCount >= 100 ? '🏆 Claim MacBook Pro M3 + Cash' : 'Register for 100-Sales Challenge',
                  showProgress: true,
                  currentCount: totalSalesCount,
                  targetCount: 100,
                  progressLabel: `${totalSalesCount} / 100 Sales`,
                  barColor: 'from-emerald-600 to-emerald-400',
                  rules: [
                    'Requires 100 unique, verified Paystack course purchases attributed directly to your affiliate code.',
                    'Count syncs directly from your Supabase sales ledger — manual/demo adjustments are permanently disabled.',
                    'Once at 100 / 100 Sales, submit your claim with delivery phone & MoMo/bank info for Admin verification.',
                    'MacBook Pro M3 delivery & GH₵ 10,000 settlement scheduled within 72 hours of Admin approval.',
                  ],
                },
                {
                  id: 'weekly_top3' as const,
                  tag: 'WEEKLY FRIDAY POOL',
                  title: 'Weekly Friday Fast-Start Top 3 Pool',
                  description: 'Close 15 verified sales within the current Monday–Sunday cycle to qualify for the Top 3 GH₵ 2,000 / Week cash pool.',
                  image: '/images/contests/contest_weekly_pool.jpg',
                  prizeLabel: 'Weekly Cash Pool',
                  prizeDisplay: `${formatAmount(2000)} / Week`,
                  accentBorder: 'border-purple-500/35 shadow-[0_0_35px_rgba(168,85,247,0.12)]',
                  badgeStyle: 'bg-purple-500/20 border-purple-400/50 text-purple-300',
                  prizeTextColor: 'text-purple-300',
                  buttonStyle: 'bg-purple-500 hover:bg-purple-400 text-white',
                  buttonText: weeklySalesCount >= 15 ? '🏆 Claim Weekly Top 3 Entry' : 'Enter Weekly Top 3 Pool',
                  showProgress: true,
                  currentCount: weeklySalesCount,
                  targetCount: 15,
                  progressLabel: `${weeklySalesCount} / 15 Weekly`,
                  barColor: 'from-purple-600 to-purple-400',
                  rules: [
                    'Progress counts strictly verified rows in public.pillar2_sales created since Monday 00:00 UTC this week.',
                    'Affiliates reaching 15+ weekly sales compete for Top 3 shares of the GH₵ 2,000.00 weekly pool.',
                    'Submit your Weekly Pool entry so Admin audits weekly timestamps & dispatches Friday pool rewards.',
                    'Weekly progress resets automatically every Monday at 00:00 UTC.',
                  ],
                },
              ].map((card) => {
                const latestSub = contestSubmissions.find((s) => s.contest_id === card.id);
                const participants = Math.max(
                  contestParticipantCounts[card.id] || 0,
                  latestSub ? 1 : 0
                );
                const isRulesExpanded = Boolean(expandedContestRules[card.id]);
                const pct =
                  card.showProgress && card.targetCount > 0
                    ? Math.min(100, (card.currentCount / card.targetCount) * 100)
                    : 0;

                return (
                  <div
                    key={card.id}
                    className={`bg-gradient-to-br from-[#0f172a] to-[#131b2e] border ${card.accentBorder} rounded-3xl overflow-hidden flex flex-col`}
                  >
                    {/* Ultra-Luxury 4K Hero Banner Header */}
                    <div className="relative h-48 w-full overflow-hidden bg-black">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="h-48 w-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/55 to-black/30" />

                      {/* Top Badges: Contest Type & Live Participant Counter */}
                      <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md ${card.badgeStyle}`}>
                          {card.tag}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-black/70 border border-white/15 text-[11px] font-bold text-gray-200 backdrop-blur-md flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{participants} Verified {participants === 1 ? 'Participant' : 'Participants'}</span>
                        </span>
                      </div>

                      {/* Glowing Prize Overlay */}
                      <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-gray-300 font-bold block">
                            {card.prizeLabel}
                          </span>
                          <span className={`text-xl md:text-2xl font-black drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] ${card.prizeTextColor}`}>
                            {card.prizeDisplay}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xl md:text-2xl font-black text-white">{card.title}</h3>
                          <p className="text-xs md:text-sm text-gray-400 mt-1.5 leading-relaxed">
                            {card.description}
                          </p>
                        </div>

                        {card.showProgress && (
                          <div className="bg-black/40 rounded-2xl p-4 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                                Real Verified Supabase Progress
                              </span>
                              <span className="text-base font-black text-white">
                                {card.progressLabel}
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${card.barColor} transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Live Contest Application Status Tracker (Phase 3) */}
                        {latestSub && (
                          <div className="bg-[#141d30] border border-white/10 rounded-2xl p-4 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                Contest Application Status
                              </span>
                              {latestSub.status === 'pending_review' && (
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black">
                                  ⏳ Under Review
                                </span>
                              )}
                              {latestSub.status === 'processing' && (
                                <span className="px-2.5 py-1 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 text-xs font-black animate-pulse inline-flex items-center gap-1.5">
                                  <RefreshCcw className="w-3 h-3 animate-spin" />
                                  🔄 Processing Verification...
                                </span>
                              )}
                              {latestSub.status === 'approved_winner' && (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-black">
                                  🏆 Approved Winner!
                                </span>
                              )}
                              {latestSub.status === 'rejected' && (
                                <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-black">
                                  ❌ Declined
                                </span>
                              )}
                            </div>
                            {latestSub.admin_note && (
                              <p className="text-xs text-gray-300">{latestSub.admin_note}</p>
                            )}
                            <p className="text-[10px] text-gray-500 font-mono">
                              Submitted {new Date(latestSub.created_at).toLocaleString()}
                              {latestSub.platform_handle ? ` • ${latestSub.platform_handle}` : ''}
                            </p>
                          </div>
                        )}

                        {/* Interactive Rules & Qualification Checklist Drawer */}
                        <div className="border border-white/10 rounded-2xl bg-black/25 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedContestRules((prev) => ({
                                ...prev,
                                [card.id]: !prev[card.id],
                              }))
                            }
                            className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-gray-200 hover:bg-white/5 transition-colors"
                          >
                            <span>📋 View Official Contest Rules & Qualification Checklist</span>
                            <ChevronRight
                              className={`w-4 h-4 text-gray-400 transition-transform ${
                                isRulesExpanded ? 'rotate-90' : ''
                              }`}
                            />
                          </button>
                          {isRulesExpanded && (
                            <div className="px-4 pb-4 pt-1 border-t border-white/10 space-y-2">
                              {card.rules.map((rule, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{rule}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setContestModalOpen(card.id)}
                        className={`w-full py-3.5 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${card.buttonStyle}`}
                      >
                        {card.id === 'viral_100k' ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <Trophy className="w-4 h-4" />
                        )}
                        <span>{card.buttonText}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 7: DUAL-CORRIDOR FRIDAY PAYOUT DESK & GLOBAL MANUAL PORTAL */}
        {/* ================================================================== */}
        {activeSection === "payouts" && (
          <div
            className={
              isFullScreenPayoutPortal
                ? "fixed inset-0 z-[60] bg-[#070b14] overflow-y-auto px-4 md:px-10 py-6 md:py-10 space-y-6"
                : "space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
            }
          >
            {/* Header & Full-Screen Portal View Switcher */}
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-white">
                    Global Friday Payout Portal
                  </h2>
                  <p className="text-xs md:text-sm text-gray-400">
                    Dual-Corridor Settlement Engine • Instant Paystack Transfers & International Manual Treasury
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div
                  className={`px-3.5 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 ${
                    isFridayGMT
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                  }`}
                >
                  {isFridayGMT ? '🟢 Friday Express Window LIVE (GMT)' : '💸 Payout Requests Open 24/7 • Friday Schedule'}
                </div>
                <button
                  type="button"
                  onClick={() => setIsFullScreenPayoutPortal((prev) => !prev)}
                  className="px-3.5 py-2 rounded-xl bg-[#141d30] hover:bg-[#1c2842] border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isFullScreenPayoutPortal ? 'Exit Full-Screen Portal' : 'Full-Screen Portal View'}</span>
                </button>
                <Link
                  href="/affiliate/payout-portal"
                  className="px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Dedicated Portal URL ↗</span>
                </Link>
              </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-6">
              {/* FRIDAY SETTLEMENT SCHEDULE & 24/7 ADMIN REQUEST BANNER */}
              {!isFridayGMT ? (
                <div className="bg-gradient-to-r from-indigo-950/90 via-[#0f172a] to-emerald-950/70 border border-indigo-500/40 rounded-3xl p-5 md:p-6 shadow-[0_0_30px_rgba(59,130,246,0.12)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Send className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-black text-white">
                        💸 Submit Payout Requests Anytime — Live Admin Treasury Tracking
                      </h3>
                      <p className="text-xs text-indigo-200/80 mt-1">
                        Submit your Mobile Money (MTN / Telecel / AT) or Bank Transfer request below right now. Your verified balance is reserved immediately and tracked live from Pending Review → Processing → Paid & Settled.
                      </p>
                    </div>
                  </div>
                  <div className="bg-black/50 border border-indigo-500/40 rounded-2xl px-4 py-3 text-center shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 block mb-1">
                      NEXT FRIDAY CYCLE (00:00 GMT)
                    </span>
                    <div className="font-mono text-lg md:text-xl font-black text-white tracking-wider">
                      {fridayCountdown.days}d : {fridayCountdown.hours}h : {fridayCountdown.minutes}m : {fridayCountdown.seconds}s
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-emerald-950/90 via-[#0d221c] to-emerald-950/90 border-2 border-emerald-500/50 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Unlock className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <h3 className="text-base font-black text-white">
                        🟢 Friday Express Settlement Window Is LIVE (00:00 – 23:59 GMT)
                      </h3>
                      <p className="text-xs text-emerald-200/80">
                        Submit Mobile Money, Bank Transfer, or Global Settlement requests for priority Admin dispatch.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-emerald-500 text-black px-3 py-1.5 rounded-xl">
                    ACTIVE NOW
                  </span>
                </div>
              )}

              {/* EXECUTIVE CORRIDOR NOTICE BANNER */}
              <div className="bg-[#0f172a] border border-indigo-500/30 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block mb-1.5">
                      ⚡ Instant Automated Paystack Transfers Supported In:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        '🇬🇭 Ghana (GHS)',
                        '🇳🇬 Nigeria (NGN)',
                        '🇰🇪 Kenya (KES)',
                        '🇿🇦 South Africa (ZAR)',
                        "🇨🇮 Côte d'Ivoire (XOF)"
                      ].map((countryTag) => (
                        <span
                          key={countryTag}
                          className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold"
                        >
                          {countryTag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="text-xs md:text-sm text-amber-100 leading-relaxed">
                    <strong className="text-amber-400 font-black">🌍 International / Unsupported Country Notice:</strong>{' '}
                    <em>
                      "Residing in the USA, UK, Europe, Asia, or any country not listed above? Tap the{' '}
                      <strong className="text-white">[🌍 Global Manual Payout Form]</strong> button below to submit your international bank, Mobile Money, or USDT details for direct executive settlement."
                    </em>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPayoutCorridor('GLOBAL_MANUAL');
                      setPayoutFeedback(null);
                    }}
                    className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-all shadow-lg shadow-amber-500/20"
                  >
                    🌍 Global Manual Payout Form
                  </button>
                </div>

                {/* TWO LARGE INTERACTIVE MODE SWITCHER TABS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayoutCorridor('PAYSTACK_AUTO');
                      setPayoutFeedback(null);
                    }}
                    className={`py-4 px-5 rounded-2xl font-black text-xs md:text-sm border-2 transition-all flex items-center justify-center gap-2.5 ${
                      payoutCorridor === 'PAYSTACK_AUTO'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                        : 'bg-[#141d30] border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>⚡ Instant Paystack Transfer (Supported Countries)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPayoutCorridor('GLOBAL_MANUAL');
                      setPayoutFeedback(null);
                    }}
                    className={`py-4 px-5 rounded-2xl font-black text-xs md:text-sm border-2 transition-all flex items-center justify-center gap-2.5 ${
                      payoutCorridor === 'GLOBAL_MANUAL'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                        : 'bg-[#141d30] border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>🌍 Global Manual Settlement Portal (All Other Countries)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Balances & Separate Wallet Deposit History */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-3xl p-6 md:p-8 shadow-xl">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-100 block mb-2">
                      AVAILABLE BALANCE
                    </span>
                    <div className="text-4xl md:text-5xl font-black text-white mb-2">
                      {formatAmount(availableBalanceGHS)}
                    </div>
                    <span className="text-xs font-mono text-indigo-200 block mb-6">
                      Settlement Base: GH₵ {availableBalanceGHS.toFixed(2)} GHS
                    </span>
                    <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6">
                      <div>
                        <span className="text-[10px] text-indigo-200 block uppercase font-bold mb-1">
                          Total Earned (Sales)
                        </span>
                        <span className="text-lg font-bold text-white">{formatAmount(totalEarningsGHS)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-200 block uppercase font-bold mb-1">
                          Total Withdrawn
                        </span>
                        <span className="text-lg font-bold text-white">{formatAmount(withdrawnBalanceGHS)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDepositModalOpen(true)}
                      className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      + Deposit Funds via Paystack 💳
                    </button>
                  </div>

                  {/* Separate Wallet Deposits History (Strictly Isolated from Sales Ledger) */}
                  <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span>Wallet Deposits & Renewals History</span>
                      </h3>
                      <span className="text-[10px] text-gray-500 font-mono">Isolated from Sales Ledger</span>
                    </div>
                    {walletHistory.length === 0 ? (
                      <p className="text-xs text-gray-500 py-3">
                        No direct wallet deposits recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {walletHistory.map((item) => (
                          <div
                            key={item.id}
                            className="bg-[#141d30] border border-white/5 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-white block">{item.type}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {item.reference} • {item.date}
                              </span>
                            </div>
                            <span className="font-black text-emerald-400">
                              +GH₵ {item.amountGHS.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Active Corridor Withdrawal Form */}
                <div className="lg:col-span-7 bg-[#0f172a] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
                  {payoutFeedback && (
                    <div
                      className={`p-4 rounded-2xl mb-6 text-xs md:text-sm font-bold border ${
                        payoutFeedback.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {payoutFeedback.text}
                    </div>
                  )}

                  {/* ========================================================== */}
                  {/* TAB A: INSTANT PAYSTACK TRANSFER FORM (SUPPORTED COUNTRIES) */}
                  {/* ========================================================== */}
                  {payoutCorridor === 'PAYSTACK_AUTO' ? (
                    <form onSubmit={handlePaystackAutoPayoutSubmit} className="space-y-5">
                      <div className="border-b border-white/10 pb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                          CORRIDOR A • PAYSTACK AUTOMATED TRANSFER
                        </span>
                        <h3 className="text-xl font-black text-white mt-0.5">
                          ⚡ Instant Paystack Transfer (Supported Countries)
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Direct automated settlement to Mobile Money or Local Bank in Ghana, Nigeria, Kenya, South Africa & Côte d'Ivoire.
                        </p>
                      </div>

                      {/* 1. Select Eligible Country */}
                      <div>
                        <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5">
                          1. Select Eligible Country
                        </label>
                        <select
                          value={paystackEligibleCountry}
                          onChange={(e) => {
                            const nextCountry = e.target.value;
                            setPaystackEligibleCountry(nextCountry);
                            const nextProviders =
                              PAYSTACK_CORRIDOR_PROVIDERS[nextCountry] ||
                              PAYSTACK_CORRIDOR_PROVIDERS['Ghana (GHS)'];
                            const list =
                              paystackSettlementMethod === 'MOBILE_MONEY'
                                ? nextProviders.MOBILE_MONEY
                                : nextProviders.LOCAL_BANK;
                            setPaystackBankCode(list[0]?.code || '');
                            setAccountResolvedBadge(null);
                            setAccountResolveError(null);
                          }}
                          className="w-full bg-[#141d30] border border-white/15 px-4 py-3.5 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="Ghana (GHS)">🇬🇭 Ghana (GHS)</option>
                          <option value="Nigeria (NGN)">🇳🇬 Nigeria (NGN)</option>
                          <option value="Kenya (KES)">🇰🇪 Kenya (KES)</option>
                          <option value="South Africa (ZAR)">🇿🇦 South Africa (ZAR)</option>
                          <option value="Côte d'Ivoire (XOF)">🇨🇮 Côte d'Ivoire (XOF)</option>
                        </select>
                      </div>

                      {/* 2. Withdrawal Amount (GH₵) with MAX Quick-Fill Button */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-gray-300 uppercase">
                            2. Withdrawal Amount (GH₵)
                          </label>
                          <span className="text-[11px] text-emerald-400 font-mono">
                            Available: GH₵ {availableBalanceGHS.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max={Math.max(1, availableBalanceGHS)}
                            step="0.01"
                            required
                            value={payoutAmountGHS}
                            onChange={(e) => setPayoutAmountGHS(e.target.value)}
                            placeholder="Enter amount (GH₵)"
                            className="flex-1 bg-[#141d30] border border-white/15 px-4 py-3.5 rounded-xl text-lg text-white font-black placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setPayoutAmountGHS(availableBalanceGHS.toFixed(2))}
                            className="px-5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-xs uppercase tracking-wider transition-all"
                          >
                            MAX
                          </button>
                        </div>
                      </div>

                      {/* 3. Settlement Method */}
                      <div>
                        <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5">
                          3. Settlement Method
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'MOBILE_MONEY', label: '📱 Mobile Money' },
                            { id: 'LOCAL_BANK', label: '🏦 Local Bank Transfer' }
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                const method = m.id as 'MOBILE_MONEY' | 'LOCAL_BANK';
                                setPaystackSettlementMethod(method);
                                const countryProv =
                                  PAYSTACK_CORRIDOR_PROVIDERS[paystackEligibleCountry] ||
                                  PAYSTACK_CORRIDOR_PROVIDERS['Ghana (GHS)'];
                                const nextList =
                                  method === 'MOBILE_MONEY' ? countryProv.MOBILE_MONEY : countryProv.LOCAL_BANK;
                                setPaystackBankCode(nextList[0]?.code || '');
                                setAccountResolvedBadge(null);
                                setAccountResolveError(null);
                              }}
                              className={`py-3.5 px-4 rounded-xl text-xs font-black border transition-all ${
                                paystackSettlementMethod === m.id
                                  ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                                  : 'bg-[#141d30] border-white/10 text-gray-400 hover:bg-white/5'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. Provider / Bank Code Selector */}
                      <div>
                        <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5">
                          4. Provider / Bank Code Selector
                        </label>
                        <select
                          value={paystackBankCode}
                          onChange={(e) => {
                            setPaystackBankCode(e.target.value);
                            setAccountResolvedBadge(null);
                            setAccountResolveError(null);
                          }}
                          className="w-full bg-[#141d30] border border-white/15 px-4 py-3.5 rounded-xl text-sm text-white font-semibold focus:outline-none focus:border-emerald-500"
                        >
                          {(
                            (PAYSTACK_CORRIDOR_PROVIDERS[paystackEligibleCountry] ||
                              PAYSTACK_CORRIDOR_PROVIDERS['Ghana (GHS)'])[
                              paystackSettlementMethod === 'MOBILE_MONEY' ? 'MOBILE_MONEY' : 'LOCAL_BANK'
                            ] || []
                          ).map((prov) => (
                            <option key={prov.code} value={prov.code}>
                              {prov.name} — Code: {prov.code}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 5. Account / Mobile Money Number & Verify Account Button */}
                      <div className="space-y-4 bg-[#141d30]/70 border border-white/10 rounded-2xl p-4">
                        <div>
                          <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5">
                            5A. Account / Mobile Money Number
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              required
                              value={paystackAccountNumber}
                              onChange={(e) => {
                                setPaystackAccountNumber(e.target.value);
                                setAccountResolvedBadge(null);
                              }}
                              placeholder={
                                paystackSettlementMethod === 'MOBILE_MONEY'
                                  ? 'e.g. 024XXXXXXX / 054XXXXXXX'
                                  : 'Enter 10–16 digit Bank Account Number'
                              }
                              className="flex-1 bg-[#0b111e] border border-white/15 px-4 py-3 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                            />
                            <button
                              type="button"
                              disabled={isResolvingAccount || !paystackAccountNumber.trim()}
                              onClick={handleResolvePaystackAccount}
                              className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shrink-0"
                            >
                              {isResolvingAccount ? (
                                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="w-4 h-4" />
                              )}
                              <span>{isResolvingAccount ? 'Resolving...' : 'Verify Account'}</span>
                            </button>
                          </div>
                          {accountResolvedBadge && (
                            <p className="text-xs font-bold text-emerald-400 mt-2">{accountResolvedBadge}</p>
                          )}
                          {accountResolveError && (
                            <p className="text-xs text-amber-300 mt-2">{accountResolveError}</p>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5">
                            5B. Registered Account Holder Legal Name
                          </label>
                          <input
                            type="text"
                            required
                            value={accountHolderName}
                            onChange={(e) => setAccountHolderName(e.target.value)}
                            placeholder="Exact legal name registered on Mobile Money / Bank account"
                            className="w-full bg-[#0b111e] border border-white/15 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {freezeP2Withdrawals && (
                        <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-200 text-xs sm:text-sm font-black flex items-center gap-2.5">
                          <span>⏸️ Withdrawals are temporarily paused for scheduled settlement auditing.</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmittingPayout || availableBalanceGHS <= 0 || freezeP2Withdrawals}
                        className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black transition-all text-sm md:text-base shadow-[0_0_25px_rgba(16,185,129,0.25)] disabled:bg-gray-700 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmittingPayout ? (
                          <RefreshCcw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Zap className="w-5 h-5" />
                        )}
                        <span>
                          {availableBalanceGHS <= 0
                            ? 'Available Balance GH₵ 0.00 — Earn Commissions First'
                            : isSubmittingPayout
                            ? 'Submitting Payout Request...'
                            : 'Request Payout Now (Instant Admin Alert)'}
                        </span>
                      </button>
                    </form>
                  ) : (
                    /* ========================================================== */
                    /* TAB B: GLOBAL MANUAL SETTLEMENT PORTAL (ALL OTHER COUNTRIES) */
                    /* ========================================================== */
                    <form onSubmit={handleGlobalManualPayoutSubmit} className="space-y-5">
                      <div className="border-b border-white/10 pb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                          CORRIDOR B • EXECUTIVE INTERNATIONAL TREASURY
                        </span>
                        <h3 className="text-xl font-black text-white mt-0.5">
                          🌍 Global Manual Settlement Portal (All Other Countries)
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Bank-grade international settlement form for affiliates in the USA, UK, Europe, Asia, Canada, UAE & non-Paystack regions.
                        </p>
                      </div>

                      {/* 1. Withdrawal Amount (GH₵) + Live Estimated USD/EUR/GBP Reference */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-gray-300 uppercase">
                            1. Withdrawal Amount (GH₵)
                          </label>
                          <span className="text-[11px] text-amber-400 font-mono">
                            Available: GH₵ {availableBalanceGHS.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max={Math.max(1, availableBalanceGHS)}
                            step="0.01"
                            required
                            value={payoutAmountGHS}
                            onChange={(e) => setPayoutAmountGHS(e.target.value)}
                            placeholder="Enter amount (GH₵)"
                            className="flex-1 bg-[#141d30] border border-white/15 px-4 py-3.5 rounded-xl text-lg text-white font-black placeholder-gray-600 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => setPayoutAmountGHS(availableBalanceGHS.toFixed(2))}
                            className="px-5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black text-xs uppercase tracking-wider transition-all"
                          >
                            MAX
                          </button>
                        </div>
                        {/* Live Estimated USD / EUR / GBP Equivalent Display */}
                        <div className="mt-2 bg-black/40 border border-amber-500/20 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                          <span className="text-gray-400">Live Estimated FX Reference:</span>
                          <div className="flex flex-wrap items-center gap-3 font-bold">
                            <span className="text-emerald-400">
                              ≈ ${((Number(payoutAmountGHS) || 0) / GLOBAL_CURRENCIES.USD.rateToGHS).toFixed(2)} USD
                            </span>
                            <span className="text-sky-400">
                              ≈ €{((Number(payoutAmountGHS) || 0) / GLOBAL_CURRENCIES.EUR.rateToGHS).toFixed(2)} EUR
                            </span>
                            <span className="text-amber-300">
                              ≈ £{((Number(payoutAmountGHS) || 0) / GLOBAL_CURRENCIES.GBP.rateToGHS).toFixed(2)} GBP
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Beneficiary Full Legal Name */}
                      <div>
                        <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5">
                          2. Beneficiary Full Legal Name (Exactly as shown on Bank Account / ID)
                        </label>
                        <input
                          type="text"
                          required
                          value={globalBeneficiaryName}
                          onChange={(e) => setGlobalBeneficiaryName(e.target.value)}
                          placeholder="Full legal name matching your government ID & receiving account"
                          className="w-full bg-[#141d30] border border-white/15 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* 3. Country of Residence & City / State / Postal Address */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5">
                            3A. Country of Residence
                          </label>
                          <select
                            value={globalResidenceCountry}
                            onChange={(e) => setGlobalResidenceCountry(e.target.value)}
                            className="w-full bg-[#141d30] border border-white/15 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                          >
                            {GLOBAL_COUNTRY_LIST.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5">
                            3B. City / State / Postal Address
                          </label>
                          <input
                            type="text"
                            required
                            value={globalCityStatePostal}
                            onChange={(e) => setGlobalCityStatePostal(e.target.value)}
                            placeholder="e.g. London, SW1A 1AA / New York, NY 10001"
                            className="w-full bg-[#141d30] border border-white/15 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* 4. Active WhatsApp / International Phone Number & Verified Email Address */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5">
                            4A. Active WhatsApp / Intl Phone Number
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={globalWhatsappDialCode}
                              onChange={(e) => setGlobalWhatsappDialCode(e.target.value)}
                              className="w-28 bg-[#141d30] border border-white/15 px-2.5 py-3 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                            >
                              {COUNTRY_DIAL_CODES.map((d) => (
                                <option key={`${d.country}-${d.code}`} value={d.code}>
                                  {d.code} ({d.country.slice(0, 10)})
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              required
                              value={globalWhatsappPhone}
                              onChange={(e) => setGlobalWhatsappPhone(e.target.value)}
                              placeholder="Phone number"
                              className="flex-1 bg-[#141d30] border border-white/15 px-3.5 py-3 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5">
                            4B. Verified Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={globalVerifiedEmail}
                            onChange={(e) => setGlobalVerifiedEmail(e.target.value)}
                            placeholder="yourname@email.com"
                            className="w-full bg-[#141d30] border border-white/15 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* 5. Preferred Global Settlement Rail */}
                      <div>
                        <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5">
                          5. Preferred Global Settlement Rail
                        </label>
                        <select
                          value={globalSettlementRail}
                          onChange={(e) =>
                            setGlobalSettlementRail(
                              e.target.value as 'BANK_WIRE' | 'CRYPTO_USDT' | 'REGIONAL_WALLET'
                            )
                          }
                          className="w-full bg-[#141d30] border border-amber-500/40 px-4 py-3.5 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="BANK_WIRE">
                            🏦 International Bank Wire (SWIFT / IBAN / ACH)
                          </option>
                          <option value="CRYPTO_USDT">
                            🪙 USDT Crypto (TRC20 / BEP20 — Fastest Global Settlement)
                          </option>
                          <option value="REGIONAL_WALLET">
                            📱 International Mobile Money / Regional Wallet (Wave, Orange Money, Wise, PayPal, Revolut)
                          </option>
                        </select>
                      </div>

                      {/* 6. Dynamic Rail Details */}
                      <div className="bg-[#141d30]/80 border border-white/10 rounded-2xl p-5 space-y-4">
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block">
                          6. Dynamic Settlement Rail Coordinates
                        </span>

                        {globalSettlementRail === 'BANK_WIRE' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-bold text-gray-300 block mb-1">
                                  Bank Name *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={globalBankName}
                                  onChange={(e) => setGlobalBankName(e.target.value)}
                                  placeholder="e.g. JPMorgan Chase / Barclays / HSBC"
                                  className="w-full bg-[#0b111e] border border-white/15 px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-300 block mb-1">
                                  Account Currency *
                                </label>
                                <select
                                  value={globalAccountCurrency}
                                  onChange={(e) => setGlobalAccountCurrency(e.target.value)}
                                  className="w-full bg-[#0b111e] border border-white/15 px-3.5 py-2.5 rounded-xl text-sm text-white font-bold focus:outline-none focus:border-amber-500"
                                >
                                  {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'AED', 'CHF', 'SGD', 'INR', 'XAF', 'XOF'].map(
                                    (curr) => (
                                      <option key={curr} value={curr}>
                                        {curr}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-gray-300 block mb-1">
                                Bank Branch Address *
                              </label>
                              <input
                                type="text"
                                required
                                value={globalBankBranchAddress}
                                onChange={(e) => setGlobalBankBranchAddress(e.target.value)}
                                placeholder="Full street, city & country of your bank branch"
                                className="w-full bg-[#0b111e] border border-white/15 px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-bold text-gray-300 block mb-1">
                                  Account Number / IBAN *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={globalIbanOrAccount}
                                  onChange={(e) => setGlobalIbanOrAccount(e.target.value)}
                                  placeholder="IBAN or Account #"
                                  className="w-full bg-[#0b111e] border border-white/15 px-3.5 py-2.5 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-300 block mb-1">
                                  SWIFT / BIC Code *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={globalSwiftBic}
                                  onChange={(e) => setGlobalSwiftBic(e.target.value.toUpperCase())}
                                  placeholder="8–11 char SWIFT/BIC"
                                  className="w-full bg-[#0b111e] border border-white/15 px-3.5 py-2.5 rounded-xl text-sm text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-300 block mb-1">
                                  Routing / Sort Code (USA/UK)
                                </label>
                                <input
                                  type="text"
                                  value={globalRoutingSortCode}
                                  onChange={(e) => setGlobalRoutingSortCode(e.target.value)}
                                  placeholder="ABA / UK Sort Code"
                                  className="w-full bg-[#0b111e] border border-white/15 px-3.5 py-2.5 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {globalSettlementRail === 'CRYPTO_USDT' && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs font-bold text-gray-300 block mb-1.5">
                                Select USDT Network *
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                {(['USDT-TRC20', 'USDT-BEP20'] as const).map((net) => (
                                  <button
                                    key={net}
                                    type="button"
                                    onClick={() => setGlobalCryptoNetwork(net)}
                                    className={`py-3 px-4 rounded-xl text-xs font-black border transition-all ${
                                      globalCryptoNetwork === net
                                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                        : 'bg-[#0b111e] border-white/10 text-gray-400'
                                    }`}
                                  >
                                    {net === 'USDT-TRC20'
                                      ? '⚡ USDT-TRC20 (Tron Network)'
                                      : '🟡 USDT-BEP20 (BNB Smart Chain)'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-gray-300 block mb-1.5">
                                {globalCryptoNetwork} Wallet Address *
                              </label>
                              <input
                                type="text"
                                required
                                value={globalCryptoAddress}
                                onChange={(e) => setGlobalCryptoAddress(e.target.value)}
                                placeholder={
                                  globalCryptoNetwork === 'USDT-TRC20'
                                    ? 'T... (34-character TRON TRC20 address)'
                                    : '0x... (42-character BNB Smart Chain BEP20 address)'
                                }
                                className="w-full bg-[#0b111e] border border-white/15 px-4 py-3 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                              />
                              {globalCryptoAddress.trim().length > 0 && (
                                <p
                                  className={`text-xs font-bold mt-1.5 ${
                                    isValidUsdtWallet ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {isValidUsdtWallet
                                    ? `✓ Valid ${globalCryptoNetwork} wallet address format verified.`
                                    : globalCryptoNetwork === 'USDT-TRC20'
                                    ? '⚠️ TRC20 address must start with "T" and contain 34 valid base58 characters.'
                                    : '⚠️ BEP20 address must start with "0x" and contain 42 hexadecimal characters.'}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {globalSettlementRail === 'REGIONAL_WALLET' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs font-bold text-gray-300 block mb-1">
                                Provider Name *
                              </label>
                              <select
                                value={globalWalletProvider}
                                onChange={(e) => setGlobalWalletProvider(e.target.value)}
                                className="w-full bg-[#0b111e] border border-white/15 px-3.5 py-2.5 rounded-xl text-sm text-white font-bold focus:outline-none focus:border-amber-500"
                              >
                                {[
                                  'Wise (TransferWise)',
                                  'PayPal International',
                                  'Revolut',
                                  'Wave Mobile Money',
                                  'Orange Money',
                                  'Payoneer',
                                  'M-Pesa Global',
                                  'MTN MoMo International',
                                  'Skrill'
                                ].map((prov) => (
                                  <option key={prov} value={prov}>
                                    {prov}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-300 block mb-1">
                                Registered Email / Phone / Tag *
                              </label>
                              <input
                                type="text"
                                required
                                value={globalWalletAccountTag}
                                onChange={(e) => setGlobalWalletAccountTag(e.target.value)}
                                placeholder="Email, Phone or @Tag"
                                className="w-full bg-[#0b111e] border border-white/15 px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-300 block mb-1">
                                Receiving Currency *
                              </label>
                              <select
                                value={globalWalletCurrency}
                                onChange={(e) => setGlobalWalletCurrency(e.target.value)}
                                className="w-full bg-[#0b111e] border border-white/15 px-3.5 py-2.5 rounded-xl text-sm text-white font-bold focus:outline-none focus:border-amber-500"
                              >
                                {['USD', 'EUR', 'GBP', 'CAD', 'XOF', 'XAF', 'UGX', 'TZS', 'RWF', 'ZMW', 'AED', 'INR'].map(
                                  (curr) => (
                                    <option key={curr} value={curr}>
                                      {curr}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 7. Compliance Confirmation Checkbox */}
                      <label className="flex items-start gap-3 p-4 bg-black/40 border border-amber-500/30 rounded-2xl cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={globalComplianceConfirmed}
                          onChange={(e) => setGlobalComplianceConfirmed(e.target.checked)}
                          className="mt-1 w-4 h-4 accent-amber-500 shrink-0"
                        />
                        <span className="text-xs text-gray-200 leading-relaxed font-medium">
                          I confirm that the beneficiary details above are 100% accurate and match my verified identity.
                        </span>
                      </label>

                      {freezeP2Withdrawals && (
                        <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-200 text-xs sm:text-sm font-black flex items-center gap-2.5">
                          <span>⏸️ Withdrawals are temporarily paused for scheduled settlement auditing.</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmittingPayout || availableBalanceGHS <= 0 || freezeP2Withdrawals}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-black font-black transition-all text-sm md:text-base shadow-[0_0_25px_rgba(245,158,11,0.25)] disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmittingPayout ? (
                          <RefreshCcw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Globe className="w-5 h-5" />
                        )}
                        <span>
                          {availableBalanceGHS <= 0
                            ? 'Available Balance GH₵ 0.00'
                            : isSubmittingPayout
                            ? 'Dispatching Global Settlement Request...'
                            : 'Submit Global Manual Payout Request'}
                        </span>
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* LIVE PAYOUT HISTORY & REAL-TIME ADMIN STATUS TRACKER (Phase 4) */}
              <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-emerald-400" />
                      <span>Real-Time Payout History & Settlement Status</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Live synced directly from <code className="text-emerald-400">pillar2_payout_requests</code> — updates automatically when Admin changes status.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadSupabaseData()}
                    className="px-4 py-2 rounded-xl bg-[#141d30] hover:bg-[#1c2842] border border-white/10 text-xs font-bold text-gray-200 flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <RefreshCcw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Refresh Status</span>
                  </button>
                </div>

                {payoutRequests.length === 0 ? (
                  <div className="text-center py-10 bg-[#141d30]/50 border border-white/5 rounded-2xl">
                    <DollarSign className="w-9 h-9 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-300">No payout requests submitted yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submit a Mobile Money, Bank Transfer, or Global settlement request above to track live Admin progress here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs md:text-sm">
                      <thead className="bg-[#141d30] text-gray-400 uppercase text-[11px] font-bold">
                        <tr>
                          <th className="px-4 py-3 rounded-l-xl">Date</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Method & Account</th>
                          <th className="px-4 py-3">Live Status</th>
                          <th className="px-4 py-3 rounded-r-xl">Admin Status Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {payoutRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs text-gray-400">
                              {new Date(req.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap font-black text-white">
                              GH₵ {Number(req.amount_ghs || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-emerald-300">{req.payout_method}</div>
                              <div className="text-[11px] text-gray-300 font-mono">
                                {req.account_number} • {req.account_name}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {req.status === 'pending' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black">
                                  🟡 Pending Review
                                </span>
                              )}
                              {req.status === 'processing' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 text-xs font-black animate-pulse shadow-[0_0_15px_rgba(56,189,248,0.25)]">
                                  <RefreshCcw className="w-3.5 h-3.5 animate-spin text-sky-300" />
                                  🔵 Processing... (Transfer Initiated by Admin)
                                </span>
                              )}
                              {req.status === 'paid' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                                  🟢 Paid & Settled
                                </span>
                              )}
                              {req.status === 'rejected' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-black">
                                  🔴 Rejected / Returned to Balance
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-gray-300 max-w-xs">
                              {req.admin_status_note || 'Awaiting Admin review'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 8: CALCULATOR (PROFIT SIMULATOR) */}
        {/* ================================================================== */}
        {activeSection === "calculator" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Income Simulator</h2>
                <p className="text-sm text-gray-400">Calculate your potential earnings.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 md:p-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Select Product to Simulate</label>
                    <select
                      value={calcProductId}
                      onChange={(e) => setCalcProductId(e.target.value)}
                      className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50"
                    >
                      {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>

                  <div>
                     <div className="flex justify-between items-center mb-2">
                       <label className="text-xs font-bold text-gray-400 uppercase">Sales per Day</label>
                       <span className="text-xl font-black text-blue-400">{calcDailySales}</span>
                     </div>
                     <input
                       type="range"
                       min="1"
                       max="50"
                       value={calcDailySales}
                       onChange={(e) => setCalcDailySales(Number(e.target.value))}
                       className="w-full accent-blue-500 h-2 bg-[#141d30] rounded-lg appearance-none cursor-pointer"
                     />
                     <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
                       <span>1</span>
                       <span>50</span>
                     </div>
                  </div>

                  <div className="p-4 bg-[#141d30] rounded-2xl border border-white/5">
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-gray-400">Commission per Sale:</span>
                       <span className="font-bold text-white">
                         {formatAmount((products.find(p => p.id === calcProductId)?.priceGHS || 0) * ((products.find(p => p.id === calcProductId)?.commissionPercent || 50) / 100))}
                       </span>
                     </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#0f172a] to-[#141d30] border border-blue-500/30 rounded-3xl p-6 md:p-8 shadow-[0_0_30px_rgba(59,130,246,0.1)] flex flex-col justify-center">
                 <h3 className="text-lg font-bold text-white mb-6 text-center">Projected Income</h3>

                 <div className="space-y-4">
                   <div className="bg-black/30 rounded-2xl p-4 flex justify-between items-center border border-white/5">
                     <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">Daily</span>
                     <span className="text-xl font-black text-white">
                       {formatAmount(calcDailySales * ((products.find(p => p.id === calcProductId)?.priceGHS || 0) * ((products.find(p => p.id === calcProductId)?.commissionPercent || 50) / 100)))}
                     </span>
                   </div>
                   <div className="bg-blue-500/10 rounded-2xl p-5 flex justify-between items-center border border-blue-500/30 transform scale-[1.02] shadow-lg">
                     <span className="text-sm text-blue-300 font-bold uppercase tracking-wider flex items-center gap-2"><CalendarDays className="w-4 h-4"/> Monthly (30 days)</span>
                     <span className="text-3xl font-black text-blue-400">
                       {formatAmount(calcDailySales * 30 * ((products.find(p => p.id === calcProductId)?.priceGHS || 0) * ((products.find(p => p.id === calcProductId)?.commissionPercent || 50) / 100)))}
                     </span>
                   </div>
                   <div className="bg-black/30 rounded-2xl p-4 flex justify-between items-center border border-white/5">
                     <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">Annually</span>
                     <span className="text-xl font-black text-white">
                       {formatAmount(calcDailySales * 365 * ((products.find(p => p.id === calcProductId)?.priceGHS || 0) * ((products.find(p => p.id === calcProductId)?.commissionPercent || 50) / 100)))}
                     </span>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 9: CREATOR WHITELIST & MY COURSES & AI TOOLS & CRM & LEDGER */}
        {/* ================================================================== */}
        {activeSection === "creator" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-br from-[#141d30] to-[#0f172a] border border-fuchsia-500/30 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 blur-[80px]"></div>
               <Briefcase className="w-12 h-12 text-fuchsia-400 mx-auto mb-6 relative z-10" />
               <h2 className="text-3xl font-black text-white mb-4 relative z-10">Creator Whitelist Portal</h2>
               <p className="text-gray-400 max-w-2xl mx-auto mb-8 relative z-10">
                 Want to list your own high-converting digital product on the HorPal Marketplace? Read the strict QA requirements and submit your application to our board.
               </p>
               <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
                 <Link href="/whitelist" className="px-8 py-4 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black transition-all shadow-[0_0_20px_rgba(192,38,211,0.3)]">
                   Open Official Creator Whitelist Site (/whitelist) ↗
                 </Link>
                 <a href="mailto:horpalservice@gmail.com?subject=Creator%20Whitelist%20Submission" className="px-8 py-4 rounded-xl bg-[#141d30] hover:bg-[#1b263f] border border-white/10 text-white font-bold transition-all">
                   Submit Application via Email
                 </a>
               </div>
            </div>
          </div>
        )}

        {activeSection === "rules" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-gradient-to-br from-[#141d30] to-[#0f172a] border border-emerald-500/30 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px]"></div>
               <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-6 relative z-10" />
               <h2 className="text-3xl font-black text-white mb-4 relative z-10">Official Rules & Regulations</h2>
               <p className="text-gray-400 max-w-2xl mx-auto mb-8 relative z-10">
                 Review the complete governance, payout policies, unique link attribution rules, and anti-spam code.
               </p>
               <Link href="/rules" className="px-8 py-4 rounded-xl inline-block bg-white hover:bg-gray-200 text-black font-black transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] relative z-10">
                 Read Full Official Rules & Regulations Site (/rules) ↗
               </Link>
            </div>
          </div>
        )}

        {activeSection === "my_courses" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-white mb-2">My Unlocked Courses & Drive Vault</h2>
            {unlockedProductIds.length === 0 ? (
              <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-12 text-center">
                <Folder className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">You haven't unlocked any courses yet.</p>
                <button onClick={() => setActiveSection("marketplace")} className="mt-4 px-6 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">Browse Marketplace</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.filter(p => unlockedProductIds.includes(p.id)).map(p => (
                  <div key={p.id} className="bg-[#0f172a] border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[40px]"></div>
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/30">
                      <Folder className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{p.title}</h3>
                    <p className="text-xs font-bold text-amber-400 mb-2">Created by {p.creator}</p>
                    <p className="text-sm text-gray-400 mb-6">Full Google Drive Access Granted.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <a href={p.deliveryUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all text-center flex items-center justify-center gap-2">
                        <Folder className="w-4 h-4"/> Open Drive Folder ↗
                      </a>
                      <button onClick={() => { setActiveSection("exam"); setExamProductId(p.id); }} className="flex-1 py-3 rounded-xl bg-[#141d30] hover:bg-[#1b263f] border border-white/10 text-white font-bold text-xs transition-all text-center flex items-center justify-center gap-2">
                        <Award className="w-4 h-4"/> Take Certification Exam
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "ai_tools" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-3"><Sparkles className="w-6 h-6 text-purple-400"/> AI Tools & Generators</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tool 1: WhatsApp Auto-Closer Link Builder */}
              <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">WhatsApp Auto-Closer Link</h3>
                  <p className="text-xs text-gray-400 mb-4">Generate a live wa.me link with your tracked affiliate product link and pre-filled closing message.</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Product Offer</label>
                      <select
                        value={waCloserProduct}
                        onChange={(e) => setWaCloserProduct(e.target.value)}
                        className="w-full bg-[#141d30] border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.title} ({formatAmount(p.priceGHS)})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Lead WhatsApp Number (Optional)</label>
                      <input
                        type="text"
                        value={waCloserNumber}
                        onChange={(e) => setWaCloserNumber(e.target.value)}
                        placeholder="e.g. 233544000000"
                        className="w-full bg-[#141d30] border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Pre-filled Closing Script ({'{LINK}'} = Your Ref URL)</label>
                      <textarea
                        rows={3}
                        value={waCloserCustomPitch}
                        onChange={(e) => setWaCloserCustomPitch(e.target.value)}
                        placeholder={`Hi! Here is your verified instant-access link for {PRODUCT}: {LINK}`}
                        className="w-full bg-[#141d30] border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                      />
                    </div>
                  </div>
                </div>
                {(() => {
                  const chosenProd = products.find((p) => p.id === waCloserProduct) || products[0];
                  const trackedLink = chosenProd ? getUniqueProductAffiliateLink(chosenProd) : `${appOrigin}/affiliate?ref=${userAffiliateCode}`;
                  const template = waCloserCustomPitch.trim() || `Hi! Here is your verified instant-access link for ${chosenProd?.title || 'this HorPal offer'}: ${trackedLink}`;
                  const finalMsg = template
                    .replace(/\{LINK\}/g, trackedLink)
                    .replace(/\{PRODUCT\}/g, chosenProd?.title || 'HorPal Offer');
                  const cleanPhone = waCloserNumber.replace(/[^\d]/g, '');
                  const waHref = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMsg)}`;
                  return (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(waHref, 'wa-closer')}
                        className="flex-1 py-2.5 rounded-xl bg-[#141d30] hover:bg-[#1b263f] border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedKey === 'wa-closer' ? 'Copied ✓' : 'Copy Link'}
                      </button>
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 rounded-xl bg-[#25D366] hover:brightness-110 text-black font-black text-xs flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Open WhatsApp
                      </a>
                    </div>
                  );
                })()}
              </div>

              {/* Tool 2: Bio-Link Storefront */}
              <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Bio-Link Storefront</h3>
                  <p className="text-xs text-gray-400 mb-4">Your single URL showcasing all {products.length} products with your unique 50% commission affiliate code.</p>
                  <div className="flex bg-[#141d30] border border-white/10 rounded-xl overflow-hidden mb-3">
                    <input type="text" readOnly value={`${appOrigin}/affiliate?ref=${userAffiliateCode}`} className="flex-1 bg-transparent px-3 py-2.5 text-xs text-emerald-300 font-mono outline-none" />
                    <button onClick={() => handleCopy(`${appOrigin}/affiliate?ref=${userAffiliateCode}`, 'store')} className="px-3 bg-white/5 hover:bg-white/10 border-l border-white/10 text-emerald-400">
                      {copiedKey === 'store' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="bg-[#141d30]/70 border border-white/5 rounded-xl p-3 text-[11px] text-gray-400">
                    Includes all <span className="text-white font-bold">{products.length}</span> HD AI-covered offers tagged automatically with <span className="text-emerald-400 font-mono">{userAffiliateCode}</span>.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBioLinkPreview(true)}
                  className="w-full py-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-black text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Eye className="w-4 h-4" /> Preview Storefront ({products.length} Offers)
                </button>
              </div>

              {/* Tool 3: Social Proof Flyer Generator */}
              <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Social Proof Flyer</h3>
                  <p className="text-xs text-gray-400 mb-4">Generate & export a crisp 1080×1080 PNG HorPal Earnings Flyer for your WhatsApp Status, Instagram, or TikTok.</p>
                  {flyerPreviewUrl && (
                    <div className="mb-3 rounded-2xl overflow-hidden border border-purple-500/30 bg-black/40 p-2">
                      <img src={flyerPreviewUrl} alt="HorPal Social Proof Flyer" className="w-full h-40 object-contain rounded-xl" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateSocialProofFlyer}
                    className="flex-1 py-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-black text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Sparkles className="w-4 h-4" /> {flyerPreviewUrl ? 'Regenerate PNG Flyer' : 'Create & Download Flyer'}
                  </button>
                  {flyerPreviewUrl && (
                    <a
                      href={flyerPreviewUrl}
                      download={`HorPal-SocialProof-${userAffiliateCode || 'Partner'}.png`}
                      className="px-4 py-3 rounded-xl bg-[#141d30] hover:bg-[#1b263f] border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "leads_crm" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Abandoned Checkout Leads CRM</h2>
                <p className="text-sm text-gray-400">Follow up with buyers who filled Step 1 but didn't complete payment.</p>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden">
              {abandonedLeads.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No abandoned leads yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#141d30] border-b border-white/10 text-gray-400 text-xs uppercase font-bold">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Lead Info</th>
                        <th className="px-6 py-4">Product Target</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {abandonedLeads.map(lead => (
                        <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono text-gray-400 whitespace-nowrap">{lead.createdAt}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{lead.fullName}</div>
                            <div className="text-xs text-gray-400">{lead.email}</div>
                            <div className="text-xs text-gray-400">{lead.phone}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-emerald-400 font-bold max-w-[200px] truncate">{lead.productTitle}</div>
                            <div className="text-xs text-gray-500">{formatAmount(lead.amountGHS)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <a
                              href={`https://wa.me/${lead.phone.replace('+', '')}?text=${encodeURIComponent(`Hello ${lead.fullName}, I noticed you started the checkout process for ${lead.productTitle} but didn't complete it. Do you need any help with the payment?`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 rounded-lg text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap hover:bg-[#25D366]/30"
                            >
                              <MessageSquare className="w-3.5 h-3.5"/> Recover Lead
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "ledger" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Financial Sales Ledger</h2>
                <p className="text-sm text-gray-400">Complete record of your verified commissions.</p>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden">
              {transactions.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No verified sales yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#141d30] border-b border-white/10 text-gray-400 text-xs uppercase font-bold">
                      <tr>
                        <th className="px-6 py-4">Date / UID</th>
                        <th className="px-6 py-4">Buyer</th>
                        <th className="px-6 py-4">Product</th>
                        <th className="px-6 py-4 text-right">Commission (50%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs text-gray-400 mb-1">{tx.date}</div>
                            <div className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded inline-block text-gray-300">{tx.orderUid}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{tx.buyerName}</div>
                            <div className="text-xs text-gray-400">{tx.buyerEmail}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-300 max-w-[200px] truncate">{tx.productTitle}</div>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 mt-1 inline-block">Paystack Verified</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-lg font-black text-emerald-400">{formatAmount(tx.commissionGHS)}</div>
                            <div className="text-[10px] text-gray-500 line-through">{formatAmount(tx.amountGHS)} Gross</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 11: PROFILE & SETTINGS (FALLBACK IF MODAL NOT USED) */}
        {/* ================================================================== */}
        {activeSection === "profile" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white mb-2">Account Details</h2>
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 text-center mb-6">
              <p className="text-gray-400 mb-4">Please use the Settings Modal to edit your profile.</p>
              <button onClick={() => setActiveSettingsModal('profile')} className="px-6 py-3 rounded-xl bg-[#141d30] border border-white/10 text-white font-bold text-sm">Open Settings Modal</button>
            </div>

            {/* ================================================================== */}
            {/* LIVE 1-YEAR AFFILIATE LICENSE COUNTDOWN CARD (PROFILE) */}
            {/* ================================================================== */}
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-5 shadow-xl relative overflow-hidden">
               <div className="flex items-center justify-between mb-4 relative z-10">
                 <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                   AFFILIATE ANNUAL LICENSE TIMER
                 </span>
                 {timeRemaining.expired ? (
                    <span className="text-[10px] font-black bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full border border-rose-500/30">
                      🔴 LICENSE EXPIRED
                    </span>
                 ) : (
                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                      ✅ ANNUAL LICENSE ACTIVE
                    </span>
                 )}
               </div>

               <div className="grid grid-cols-4 gap-2 mb-4 relative z-10">
                 {[
                   { label: 'DAYS', val: timeRemaining.days },
                   { label: 'HOURS', val: timeRemaining.hours.toString().padStart(2, '0') },
                   { label: 'MINS', val: timeRemaining.minutes.toString().padStart(2, '0') },
                   { label: 'SECS', val: timeRemaining.seconds.toString().padStart(2, '0') }
                 ].map((t, idx) => (
                   <div key={idx} className="bg-[#141d30] border border-emerald-500/20 rounded-xl p-3 flex flex-col items-center justify-center">
                     <span className="text-2xl md:text-3xl font-black text-emerald-400 font-mono tracking-wider">{t.val}</span>
                     <span className="text-[9px] font-bold text-gray-500 uppercase mt-1">{t.label}</span>
                   </div>
                 ))}
               </div>

               <div className="bg-black/30 border border-white/5 rounded-xl p-3 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px] font-medium text-gray-400">
                 <div className="text-emerald-300 font-bold">
                   ✅ Annual Affiliate License Active • [{timeRemaining.days}d {String(timeRemaining.hours).padStart(2, '0')}h {String(timeRemaining.minutes).padStart(2, '0')}m {String(timeRemaining.seconds).padStart(2, '0')}s] Remaining
                 </div>
                 <div className="text-left md:text-right font-mono bg-white/5 px-2 py-1 rounded">
                   {licenseExpiresAt > 0
                     ? `Expires: ${new Date(licenseExpiresAt).toLocaleDateString()}`
                     : 'Active'}
                 </div>
               </div>

               {timeRemaining.expired && (
                 <div className="mt-4 flex flex-col md:flex-row gap-3 relative z-10">
                   <button
                     onClick={() => setIsRenewalModalOpen(true)}
                     className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                   >
                     Renew Annual License — GH₵ 45.00 (50% Renewal Discount)
                   </button>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 12: NOTIFICATIONS (FALLBACK IF DRAWER NOT USED) */}
        {/* ================================================================== */}
        {activeSection === "notifications" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white mb-2">Notifications Center</h2>
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 text-center">
              <p className="text-gray-400 mb-4">Please use the Notifications Drawer from the top right.</p>
              <button onClick={() => setIsNotificationsOpen(true)} className="px-6 py-3 rounded-xl bg-[#141d30] border border-white/10 text-white font-bold text-sm">Open Notifications</button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 13: SUPPORT */}
        {/* ================================================================== */}
        {activeSection === "support" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-white mb-2">Help & Support Desk</h2>
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 md:p-8">
               <p className="text-gray-400 mb-8 max-w-xl">Need assistance? Our support agents are available 24/7 to help you with your affiliate account, payouts, or technical issues.</p>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 <a href="mailto:horpalservice@gmail.com" className="p-8 bg-[#141d30] rounded-2xl flex flex-col items-center justify-center text-center hover:bg-[#1c2842] border border-white/5 hover:border-indigo-500/30 transition-all group">
                   <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <Mail className="w-8 h-8 text-indigo-400" />
                   </div>
                   <span className="font-bold text-white mb-1">Email Support</span>
                   <span className="text-xs text-gray-400">horpalservice@gmail.com</span>
                 </a>
                 <a href="mailto:geestablish@gmail.com" className="p-8 bg-[#141d30] rounded-2xl flex flex-col items-center justify-center text-center hover:bg-[#1c2842] border border-white/5 hover:border-rose-500/30 transition-all group">
                   <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <Briefcase className="w-8 h-8 text-rose-400" />
                   </div>
                   <span className="font-bold text-white mb-1">Creator Desk</span>
                   <span className="text-xs text-gray-400">geestablish@gmail.com</span>
                 </a>
                 <a href="https://wa.me/233534671381" target="_blank" rel="noopener noreferrer" className="p-8 bg-[#141d30] rounded-2xl flex flex-col items-center justify-center text-center hover:bg-[#1c2842] border border-white/5 hover:border-[#25D366]/30 transition-all group">
                   <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <MessageSquare className="w-8 h-8 text-[#25D366]" />
                   </div>
                   <span className="font-bold text-white mb-1">WhatsApp Chat</span>
                   <span className="text-xs text-gray-400">0534671381</span>
                 </a>
               </div>
            </div>
          </div>
        )}
      </main>
      {/* ==================================================================== */}
      {/* MODALS (RENDERED ON TOP) */}
      {/* ==================================================================== */}

      {/* Checkout Step 1 Modal */}
      {checkoutStep === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] w-full max-w-md rounded-3xl overflow-hidden border border-white/10 animate-in zoom-in-95">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#141d30]">
               <h3 className="text-lg font-bold text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-400"/> Secure Checkout</h3>
               <button onClick={() => { setCheckoutStep(null); setActiveSalesPageProduct(null); }} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                 <X className="w-5 h-5 text-gray-400" />
               </button>
            </div>
            <div className="p-6">
               <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl mb-6">
                 <h4 className="text-amber-400 font-bold text-xs mb-1">⚠️ Important Instructions</h4>
                 <p className="text-xs text-amber-200/80">1. Please ensure to use your correct details for checkout.<br/>2. Make sure your EMAIL ADDRESS is CORRECT, ACTIVE and ACCESSIBLE, otherwise you will NOT receive access.</p>
               </div>

               <form onSubmit={handleCheckoutStep1Next} className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">Full Name</label>
                   <input type="text" required value={buyerFullName} onChange={(e) => setBuyerFullName(e.target.value)} className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">Email Address</label>
                   <input type="email" required value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                   <div className="col-span-1">
                     <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">Code</label>
                     <select value={buyerDialCode} onChange={(e) => setBuyerDialCode(e.target.value)} className="w-full bg-[#141d30] border border-white/10 px-2 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50">
                       <option value="+233">+233 (GH)</option>
                       <option value="+234">+234 (NG)</option>
                       <option value="+254">+254 (KE)</option>
                       <option value="+27">+27 (ZA)</option>
                       <option value="+1">+1 (US/CA)</option>
                       <option value="+44">+44 (UK)</option>
                       <option value="+91">+91 (IN)</option>
                       <option value="+971">+971 (UAE)</option>
                     </select>
                   </div>
                   <div className="col-span-2">
                     <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">Phone Number</label>
                     <input type="text" required value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                   </div>
                 </div>
                 <div>
                   <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">Country</label>
                   <select value={buyerCountry} onChange={(e) => setBuyerCountry(e.target.value)} className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50">
                     {["Ghana", "Nigeria", "Kenya", "South Africa", "United States", "United Kingdom", "India", "UAE", "Other"].map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>

                 <button type="submit" className="w-full py-4 mt-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black transition-all flex items-center justify-center gap-2">
                   Continue to Payment <ArrowRight className="w-4 h-4" />
                 </button>
               </form>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Step 2 Modal */}
      {checkoutStep === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] w-full max-w-md rounded-3xl overflow-hidden border border-white/10 animate-in zoom-in-95">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#141d30]">
               <h3 className="text-lg font-bold text-white">Payment Selection</h3>
               <button onClick={() => setCheckoutStep(1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                 <X className="w-5 h-5 text-gray-400" />
               </button>
            </div>
            <div className="p-6 space-y-6">
               <div className="flex justify-between items-center bg-[#141d30] p-4 rounded-xl border border-white/5 gap-3">
                 <span className="text-sm text-gray-400 shrink-0">Preview Currency</span>
                 <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} className="bg-[#0b111e] border border-white/10 px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50 max-w-[210px]">
                   {Object.values(GLOBAL_CURRENCIES).map(c => (
                     <option key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.name}</option>
                   ))}
                 </select>
               </div>

               {(() => {
                 const totalPayableGHS =
                   (isDirectEnrollmentCheckout
                     ? DIRECT_ENROLLMENT_GHS
                     : activeSalesPageProduct?.priceGHS || 0) + (includeOrderBump ? 80 : 0);
                 return (
                   <>
                     <div className="bg-[#141d30] p-5 rounded-2xl border border-white/5">
                       <h4 className="text-sm font-bold text-white mb-1">
                         {isDirectEnrollmentCheckout ? "HorPal Pillar 2 Direct Access" : activeSalesPageProduct?.title}
                       </h4>
                       <p className="text-xs text-gray-400 mb-4 border-b border-white/10 pb-4">
                         {isDirectEnrollmentCheckout ? "One-time Direct Enrollment Fee." : "Instant Lifetime Access to Course + Affiliate Platform."}
                       </p>

                       {!isDirectEnrollmentCheckout && (
                         <label className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4 cursor-pointer">
                           <input type="checkbox" checked={includeOrderBump} onChange={(e) => setIncludeOrderBump(e.target.checked)} className="mt-1" />
                           <div>
                             <span className="text-xs font-bold text-amber-400 block">Yes, Add Viral Hook & Closing Script Pack (+GH₵ 80)</span>
                             <span className="text-[10px] text-amber-200/70">Highly Recommended 1-Click Order Bump.</span>
                           </div>
                         </label>
                       )}

                       <div className="flex justify-between items-end">
                         <span className="text-sm text-gray-400 uppercase font-bold">Total Payable</span>
                         <div className="text-right">
                           <span className="text-2xl font-black text-white block">
                             {selectedCurrency !== "GHS" && "≈ "}
                             {formatAmount(totalPayableGHS)}
                           </span>
                           {selectedCurrency !== "GHS" && (
                             <span className="text-xs text-gray-500">Settled in GH₵ {totalPayableGHS.toFixed(2)}</span>
                           )}
                         </div>
                       </div>
                     </div>

                     <button onClick={handleLivePaystackCheckout} className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black transition-all text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                       Pay Now via Paystack (GH₵ {totalPayableGHS.toFixed(2)})
                     </button>
                   </>
                 );
               })()}
            </div>
          </div>
        </div>
      )}

      {/* Promote Studio Modal */}
      {promoteModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] w-full max-w-2xl rounded-3xl overflow-hidden border border-indigo-500/30 animate-in zoom-in-95 shadow-[0_0_50px_rgba(79,70,229,0.15)] flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-indigo-900/40 to-transparent">
               <div>
                 <h3 className="text-xl font-black text-white flex items-center gap-2"><Rocket className="w-5 h-5 text-indigo-400"/> Promote Studio</h3>
                 <span className="text-xs text-indigo-300 font-medium">{promoteModalProduct.title}</span>
               </div>
               <button onClick={() => setPromoteModalProduct(null)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                 <X className="w-5 h-5 text-gray-400" />
               </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8">
               <div className="group relative">
                 <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r ${promoteModalProduct.glowColor} blur-2xl opacity-60 group-hover:opacity-95 transition-all duration-500 pointer-events-none`} />
                 <div className="h-48 w-full rounded-2xl overflow-hidden relative mb-4 border border-white/10 shadow-2xl bg-[#070b14]">
                   <img
                     src={promoteModalProduct.imageUrl}
                     alt={promoteModalProduct.title}
                     onError={(e) => {
                       const target = e.currentTarget;
                       if (!target.dataset.fallbackApplied) {
                         target.dataset.fallbackApplied = '1';
                         target.src = getProductSvgFallback(promoteModalProduct.title, promoteModalProduct.shortCode);
                       }
                     }}
                     className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                   <span className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/65 backdrop-blur-md border border-white/20 text-xs font-black text-white shadow-lg">
                     {formatAmount(promoteModalProduct.priceGHS)}
                   </span>
                   <span className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/50 text-xs font-black text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.45)]">
                     50% COMMISSION → {formatAmount(promoteModalProduct.priceGHS * 0.5)}
                   </span>
                 </div>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                 <div className="bg-[#141d30] rounded-xl p-3 border border-white/5 text-center">
                   <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Est. EPC</span>
                   <span className="text-sm font-black text-white">{promoteModalProduct.epc || `$${promoteModalProduct.epcUSD.toFixed(2)}`}</span>
                 </div>
                 <div className="bg-[#141d30] rounded-xl p-3 border border-white/5 text-center">
                   <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Conv. Rate</span>
                   <span className="text-sm font-black text-white">{promoteModalProduct.conversionRate || promoteModalProduct.avgConvRate}</span>
                 </div>
                 <div className="bg-[#141d30] rounded-xl p-3 border border-white/5 text-center">
                   <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Refund Rate</span>
                   <span className="text-sm font-black text-white">{promoteModalProduct.refundRate || '0.2%'}</span>
                 </div>
                 <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 text-center">
                   <span className="text-[10px] text-emerald-500 uppercase font-bold block mb-1">Avg Payout</span>
                   <span className="text-sm font-black text-emerald-400">{formatAmount(promoteModalProduct.priceGHS * (promoteModalProduct.commissionPercent / 100))}</span>
                 </div>
               </div>

               <div className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-gray-400 uppercase block mb-2">1. Your Unique Tracking Link</label>
                   <div className="flex bg-[#141d30] border border-white/10 rounded-xl overflow-hidden shadow-inner">
                     <input
                       type="text"
                       readOnly
                       value={getUniqueProductAffiliateLink(promoteModalProduct, linkTags[`tag-${promoteModalProduct.id}`] || undefined)}
                       className="flex-1 bg-transparent px-4 py-3.5 text-sm text-emerald-400 font-mono outline-none selection:bg-emerald-500/30"
                     />
                     <button
                       onClick={() => handleCopy(getUniqueProductAffiliateLink(promoteModalProduct, linkTags[`tag-${promoteModalProduct.id}`] || undefined), `modal-${promoteModalProduct.id}`)}
                       className={`px-6 flex items-center justify-center transition-colors border-l border-white/10 font-bold text-sm ${copiedKey === `modal-${promoteModalProduct.id}` ? 'bg-indigo-500 text-white' : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400'}`}
                     >
                       {copiedKey === `modal-${promoteModalProduct.id}` ? 'Copied ✓' : 'Copy'}
                     </button>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">Traffic Tag (Sub-ID)</label>
                     <input
                       type="text"
                       placeholder="e.g. tiktok_bio"
                       value={linkTags[`tag-${promoteModalProduct.id}`] || ''}
                       onChange={(e) => setLinkTags(prev => ({...prev, [`tag-${promoteModalProduct.id}`]: e.target.value}))}
                       className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50"
                     />
                   </div>
                   <div>
                     <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">Custom Slug (Optional)</label>
                     <div className="flex bg-[#141d30] border border-white/10 rounded-xl overflow-hidden">
                       <span className="px-3 py-3 bg-white/5 text-gray-500 text-xs border-r border-white/10 flex items-center">horpal.com/</span>
                       <input type="text" placeholder="my-slug" className="flex-1 bg-transparent px-3 py-3 text-sm text-white focus:outline-none" />
                     </div>
                   </div>
                 </div>
               </div>

               <div className="flex flex-col sm:flex-row gap-6 bg-[#0b111e] p-6 rounded-2xl border border-white/5">
                 <div className="shrink-0 mx-auto sm:mx-0">
                   <div className="w-32 h-32 bg-white rounded-xl p-2 mx-auto">
                     <img
                       src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(getUniqueProductAffiliateLink(promoteModalProduct, linkTags[`tag-${promoteModalProduct.id}`] || undefined))}`}
                       alt="QR Code"
                       className="w-full h-full object-contain"
                     />
                   </div>
                   <button onClick={() => handleDownloadQrCode(getUniqueProductAffiliateLink(promoteModalProduct, linkTags[`tag-${promoteModalProduct.id}`] || undefined), promoteModalProduct.id)} className="w-full mt-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-white/10">
                     <Download className="w-3.5 h-3.5" /> Download QR
                   </button>
                 </div>

                 <div className="flex-1 flex flex-col justify-center space-y-3">
                   <h4 className="text-sm font-bold text-white">2. 1-Tap Quick Share</h4>
                   <a
                     href={`https://wa.me/?text=${encodeURIComponent(`Check out ${promoteModalProduct.title}!

Get it here: ${getUniqueProductAffiliateLink(promoteModalProduct, linkTags[`tag-${promoteModalProduct.id}`] || undefined)}`)}`}
                     target="_blank" rel="noopener noreferrer"
                     className="w-full py-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] font-bold text-sm transition-all flex items-center justify-center gap-2"
                   >
                     <MessageSquare className="w-4 h-4" /> Share to WhatsApp
                   </a>
                   <a
                     href={`https://t.me/share/url?url=${encodeURIComponent(getUniqueProductAffiliateLink(promoteModalProduct, linkTags[`tag-${promoteModalProduct.id}`] || undefined))}&text=${encodeURIComponent(`Check out ${promoteModalProduct.title}!`)}`}
                     target="_blank" rel="noopener noreferrer"
                     className="w-full py-3 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9]/20 border border-[#229ED9]/30 text-[#229ED9] font-bold text-sm transition-all flex items-center justify-center gap-2"
                   >
                     <Share2 className="w-4 h-4" /> Share to Telegram
                   </a>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Bio-Link Storefront Preview Modal */}
      {showBioLinkPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0f172a] w-full max-w-4xl rounded-3xl overflow-hidden border border-emerald-500/30 animate-in zoom-in-95 flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(16,185,129,0.18)]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#141d30]">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" /> Bio-Link Storefront ({products.length} Verified Offers)
                </h3>
                <p className="text-xs text-gray-400">
                  Partner Handle: <span className="text-emerald-300 font-bold">{username ? `@${username}` : `${firstName} ${lastName}`.trim() || 'Partner'}</span> • Affiliate Code: <span className="font-mono text-white">{userAffiliateCode}</span>
                </p>
              </div>
              <button onClick={() => setShowBioLinkPreview(false)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p) => {
                const trackedUrl = getUniqueProductAffiliateLink(p);
                return (
                  <div key={p.id} className="group bg-[#141d30] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="relative">
                        <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r ${p.glowColor} blur-2xl opacity-50 group-hover:opacity-90 transition-all duration-500 pointer-events-none`} />
                        <div className="h-40 w-full rounded-2xl overflow-hidden relative mb-3 border border-white/10 shadow-xl bg-[#070b14]">
                          <img
                            src={p.imageUrl}
                            alt={p.title}
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.dataset.fallbackApplied) {
                                target.dataset.fallbackApplied = '1';
                                target.src = getProductSvgFallback(p.title, p.shortCode);
                              }
                            }}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                          />
                          <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-black text-white">
                            {formatAmount(p.priceGHS)}
                          </span>
                          <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 backdrop-blur-md border border-emerald-400/50 text-[10px] font-black text-emerald-300">
                            50% → {formatAmount(p.priceGHS * 0.5)}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-sm font-black text-white mb-1 line-clamp-2">{p.title}</h4>
                      <p className="text-[11px] text-gray-400 line-clamp-2 mb-3">{p.subheadline}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(trackedUrl, `store-${p.id}`)}
                        className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white"
                      >
                        {copiedKey === `store-${p.id}` ? 'Copied ✓' : 'Copy Link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBioLinkPreview(false);
                          setActiveSalesPageProduct(p);
                        }}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black"
                      >
                        Open Page
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Profile, KYC, Security, 2FA, Support) */}
      {activeSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] w-full max-w-md rounded-3xl overflow-hidden border border-white/10 animate-in zoom-in-95">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#141d30]">
               <h3 className="text-lg font-bold text-white capitalize">
                 {isMandatoryProfileCompletion || activeSettingsModal === 'pillar2_onboarding'
                   ? 'Complete Your Pillar 2 Profile'
                   : `${activeSettingsModal.replace('_', ' ')} Settings`}
               </h3>
               {!isMandatoryProfileCompletion && (
                 <button onClick={() => setActiveSettingsModal(null)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                   <X className="w-5 h-5 text-gray-400" />
                 </button>
               )}
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto">
              <form onSubmit={handleSavePillar2Profile} className="space-y-4">
                {(activeSettingsModal === 'profile' || activeSettingsModal === 'pillar2_onboarding') && (
                  <>
                    {isMandatoryProfileCompletion && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-200 leading-relaxed">
                        <strong className="text-amber-300 block mb-1">Google OAuth Profile Verification Required</strong>
                        Please enter your real First Name, Last Name, Username, Phone Number, and Country, then click <strong>Save Profile Changes</strong> to unlock your Pillar 2 dashboard and unique referral code.
                      </div>
                    )}
                    {profileValidationError && (
                      <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-3 text-xs font-semibold text-rose-300">
                        {profileValidationError}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-400 block mb-1.5">First Name *</label>
                        <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Enter first name" className="w-full bg-[#141d30] border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 block mb-1.5">Last Name *</label>
                        <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Enter last name" className="w-full bg-[#141d30] border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">Username *</label>
                      <div className="flex items-center bg-[#141d30] border border-white/10 rounded-xl overflow-hidden focus-within:border-emerald-500/50">
                        <span className="px-3 py-2.5 text-sm font-bold text-emerald-400 bg-white/5 border-r border-white/10">@</span>
                        <input type="text" required value={username} onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))} placeholder="yourusername" className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-gray-400 block">Pillar 2 Email</label>
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">🔒 Verified Account Email</span>
                      </div>
                      <input type="email" value={currentProfile?.email || pillar2Email} readOnly disabled className="w-full bg-slate-900/90 text-slate-400 border border-amber-500/30 cursor-not-allowed select-none opacity-85 px-4 py-2.5 rounded-xl text-sm focus:outline-none" />
                      <p className="text-[10px] text-gray-500 mt-1">🔒 Your email is bound to your authenticated HorPal account and synced across Pillar 2.</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">Phone Number *</label>
                      <input type="tel" required value={pillar2Phone} onChange={(e) => setPillar2Phone(e.target.value)} placeholder="e.g. +233540000000" className="w-full bg-[#141d30] border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">Country *</label>
                      <select required value={pillar2Country} onChange={(e) => setPillar2Country(e.target.value)} className="w-full bg-[#141d30] border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50">
                        <option value="">Select your country...</option>
                        {COUNTRY_DIAL_CODES.map((c) => (
                          <option key={c.country} value={c.country}>{c.country} ({c.code})</option>
                        ))}
                        {pillar2Country && !COUNTRY_DIAL_CODES.some((c) => c.country === pillar2Country) && pillar2Country !== 'Other' && (
                          <option value={pillar2Country}>{pillar2Country}</option>
                        )}
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </>
                )}

                {activeSettingsModal === 'kyc' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">City</label>
                      <input type="text" value={pillar2City} onChange={(e) => setPillar2City(e.target.value)} className="w-full bg-[#141d30] border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">Address / Street</label>
                      <input type="text" value={pillar2Address} onChange={(e) => setPillar2Address(e.target.value)} className="w-full bg-[#141d30] border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">KYC ID Type</label>
                      <select value={kycIdType} onChange={(e) => setKycIdType(e.target.value)} className="w-full bg-[#141d30] border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none">
                        <option>Ghana Card</option>
                        <option>National ID</option>
                        <option>Passport</option>
                        <option>Driver's License</option>
                        <option>Voter's ID</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">KYC ID Number</label>
                      <input type="text" value={kycIdNumber} onChange={(e) => setKycIdNumber(e.target.value)} className="w-full bg-[#141d30] border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none" />
                    </div>
                  </>
                )}

                {activeSettingsModal === 'security' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">Current Password</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-[#141d30] border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-[#141d30] border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1.5">Confirm New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-[#141d30] border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none" />
                    </div>
                  </>
                )}

                {activeSettingsModal === '2fa' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-300">Enable Two-Factor Authentication (2FA) to secure your affiliate payouts and account access.</p>
                    <label className="flex items-center justify-between p-4 bg-[#141d30] rounded-xl border border-white/10 cursor-pointer">
                      <span className="text-sm font-bold text-white">Enable Email OTP for Payouts</span>
                      <input type="checkbox" checked={twoFactorEnabled} onChange={(e) => setTwoFactorEnabled(e.target.checked)} className="w-5 h-5 accent-emerald-500" />
                    </label>
                    {twoFactorEnabled && (
                       <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl">
                         <span className="text-emerald-400 text-xs font-bold">2FA is currently active for withdrawals.</span>
                       </div>
                    )}
                  </div>
                )}

                {activeSettingsModal !== 'support' && (
                  <button type="submit" disabled={isSavingProfile} className="w-full py-4 mt-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-black transition-all flex items-center justify-center gap-2">
                    {isSavingProfile ? 'Saving Profile Changes...' : 'Save Profile Changes'}
                  </button>
                )}
              </form>

              {activeSettingsModal === 'support' && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                    <LifeBuoy className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">How can we help?</h4>
                  <p className="text-sm text-gray-400 mb-6">Our 24/7 support team is ready to assist you.</p>
                  <a href="mailto:horpalservice@gmail.com" className="w-full py-3 rounded-xl bg-[#141d30] hover:bg-[#1b263f] border border-white/10 text-white font-bold transition-all flex items-center justify-center gap-2 mb-3">
                    <Mail className="w-4 h-4"/> Email: horpalservice@gmail.com
                  </a>
                  <a href="https://wa.me/233534671381" target="_blank" rel="noopener noreferrer" className="w-full py-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/30 text-[#25D366] font-bold transition-all flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4"/> Chat on WhatsApp (0534671381)
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Drawer Slide-over */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0f172a] h-full border-l border-white/10 animate-in slide-in-from-right shadow-2xl flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#141d30]">
               <h3 className="text-lg font-black text-white flex items-center gap-2"><Bell className="w-5 h-5 text-emerald-400"/> Notifications</h3>
               <button onClick={() => setIsNotificationsOpen(false)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                 <X className="w-5 h-5 text-gray-400" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notificationsList.length === 0 ? (
                <div className="text-center text-gray-500 py-12">No notifications yet.</div>
              ) : (
                notificationsList.map(notif => (
                  <div key={notif.id} className={`p-4 rounded-xl border transition-all ${!notif.read ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#141d30] border-white/5'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-white">{notif.title}</span>
                      <span className="text-[10px] text-gray-500">{notif.timeAgo}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{notif.subtitle}</p>
                    {notif.amountGHS && (
                      <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        + {formatAmount(notif.amountGHS)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0b111e] grid grid-cols-2 gap-3">
               <button
                 onClick={() => setNotificationsList(prev => prev.map(n => ({...n, read: true})))}
                 className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10"
               >
                 Mark All Read
               </button>
               <button
                 onClick={() => setNotificationsList([])}
                 className="py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 border border-rose-500/20"
               >
                 Clear All
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Help Bot Window */}
      {isAiBotOpen && (
        <div className="fixed bottom-24 left-4 z-50 w-[340px] max-w-[calc(100vw-32px)] bg-[#0f172a] rounded-3xl overflow-hidden border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.15)] animate-in slide-in-from-bottom-8">
           <div className="p-4 bg-gradient-to-r from-[#141d30] to-emerald-950/40 border-b border-white/10 flex justify-between items-center">
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 text-lg">💬</div>
               <div>
                 <span className="text-sm font-bold text-white block">Pillar 2 Help Desk</span>
                 <span className="text-[10px] text-emerald-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Direct Support</span>
               </div>
             </div>
             <button onClick={() => setIsAiBotOpen(false)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                 <X className="w-4 h-4 text-gray-400" />
             </button>
           </div>

           <div className="h-64 overflow-y-auto p-4 space-y-4 bg-[#0b111e]">
             {aiMessages.map((msg, i) => (
               <div key={i} className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
                 <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.sender === 'bot' ? 'bg-[#141d30] border border-white/10 text-gray-200 rounded-tl-sm' : 'bg-emerald-600 text-white rounded-tr-sm'}`}>
                   {msg.text}
                 </div>
               </div>
             ))}
           </div>

           <div className="p-3 border-t border-white/10 bg-[#141d30]">
             <form onSubmit={(e) => { e.preventDefault(); handleAiBotSend(); }} className="flex gap-2 relative">
               <input
                 type="text"
                 value={aiInput}
                 onChange={(e) => setAiInput(e.target.value)}
                 placeholder="Type your message..."
                 className="flex-1 bg-[#0b111e] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
               />
               <button type="submit" disabled={!aiInput.trim()} className="w-10 flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                 <ArrowRight className="w-4 h-4" />
               </button>
             </form>
           </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* FULL-SCREEN RENEWAL GATE LOCK (ONLY SHOWN WHEN 1-YEAR LICENSE EXPIRES) */}
      {/* ==================================================================== */}
      {timeRemaining.expired && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div className="bg-[#0f172a] w-full max-w-lg rounded-3xl overflow-hidden border border-rose-500/50 animate-in zoom-in-95 shadow-[0_0_80px_rgba(244,63,94,0.2)] relative">
            <div className="absolute top-0 left-0 w-48 h-48 bg-rose-500/10 blur-[60px] pointer-events-none"></div>

            <div className="p-6 border-b border-white/10 text-center relative z-10">
               <div className="w-16 h-16 bg-rose-500/10 border-2 border-rose-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Lock className="w-8 h-8 text-rose-400" />
               </div>
               <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2">
                 Renew Annual License — GH₵ 45.00 (50% Renewal Discount)
               </h2>
               <p className="text-sm text-gray-400">
                 Your 1-Year HorPal Affiliate License has reached its 365-day expiration date (`00:00:00`). Renew now at your 50% discount to unlock your Affiliate Hub for another full year.
               </p>
            </div>

            <div className="p-6 relative z-10 bg-[#141d30]">
               <div className="flex flex-col gap-1 mb-6 text-center border-b border-white/5 pb-6">
                 <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Annual Renewal Fee</span>
                 <span className="text-gray-500 line-through text-sm">First-Time Registration: GH₵ 90.00</span>
                 <span className="text-3xl font-black text-emerald-400 mt-1">
                   GH₵ 45.00 <span className="text-sm font-bold text-emerald-400/80 uppercase">(50% Renewal Discount)</span>
                 </span>
                 <span className="text-xs text-emerald-400/60 mt-2 font-mono">({formatAmount(45)})</span>
               </div>

               <div className="space-y-3">
                 <button
                   onClick={() => {
                     const activeEmail = (pillar2Email || currentProfile?.email || 'affiliate@horpal.com').trim();
                     const txRef = `HP_REN_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

                     const verifyRenewalOnServer = async (reference: string) => {
                       try {
                         const res = await authFetch('/api/paystack/verify-pillar2-pass', {
                           method: 'POST',
                           body: JSON.stringify({
                             reference,
                             email: activeEmail,
                             passType: 'renewal_1yr',
                           }),
                         });
                         const data = await res.json();
                         if (!res.ok || !data?.success) {
                           alert(data?.error || 'Could not verify Paystack renewal transaction.');
                           return;
                         }
                         await handleCompleteRenewal(data.pillar2_expires_at);
                       } catch (err: any) {
                         alert(err?.message || 'Error verifying renewal payment.');
                       }
                     };

                     const openPopup = () => {
                       const PaystackPop = (window as any).PaystackPop;
                       if (!PaystackPop || !PAYSTACK_PUBLIC_KEY) {
                         alert('Paystack checkout is initializing. Please try again in 2 seconds.');
                         return;
                       }
                       const handler = PaystackPop.setup({
                         key: PAYSTACK_PUBLIC_KEY,
                         email: activeEmail,
                         amount: 45 * 100, // 4500 pesewas = GH₵ 45.00
                         currency: 'GHS',
                         ref: txRef,
                         metadata: {
                           user_id: userId,
                           email: activeEmail,
                           payment_type: 'P2_RENEWAL_45_GHS',
                         },
                         callback: (response: { reference?: string }) => {
                           verifyRenewalOnServer(response?.reference || txRef);
                         },
                       });
                       handler.openIframe();
                     };

                     if (typeof window !== 'undefined' && !(window as any).PaystackPop) {
                       const script = document.createElement('script');
                       script.src = 'https://js.paystack.co/v1/inline.js';
                       script.async = true;
                       script.onload = openPopup;
                       document.body.appendChild(script);
                     } else {
                       openPopup();
                     }
                   }}
                   className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] cursor-pointer"
                 >
                   <CreditCard className="w-5 h-5" /> Pay GH₵ 45.00 via Paystack
                 </button>

                 <button
                   onClick={async () => {
                     if (availableBalanceGHS < 45) {
                       alert(
                         `Insufficient Verified Affiliate Balance (GH₵ ${availableBalanceGHS.toFixed(
                           2
                         )}). You need at least GH₵ 45.00 in your verified balance to deduct renewal.`
                       );
                       return;
                     }
                     if (!userId) {
                       alert('Please ensure you are signed in to deduct from your Supabase balance.');
                       return;
                     }
                     try {
                       const res = await authFetch('/api/pillar2/renew-balance', {
                         method: 'POST',
                         body: JSON.stringify({}),
                       });
                       const data = await res.json();
                       if (!res.ok || !data?.success) {
                         alert(data?.error || 'Could not deduct GH₵ 45.00 from affiliate balance.');
                         return;
                       }
                       await handleCompleteRenewal(
                         data.pillar2_expires_at,
                         typeof data.new_balance === 'number' ? data.new_balance : availableBalanceGHS - 45
                       );
                     } catch (err: any) {
                       alert(err?.message || 'Network error renewing from balance.');
                     }
                   }}
                   className="w-full py-4 rounded-xl bg-[#0f172a] hover:bg-[#1a2541] border border-white/10 text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                 >
                   <DollarSign className="w-5 h-5" /> Deduct GH₵ 45.00 from Balance (Available: GH₵ {availableBalanceGHS.toFixed(2)})
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Native Paystack Deposit Modal (No In-App 6-Digit Code) */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] w-full max-w-md rounded-3xl overflow-hidden border border-amber-500/30 animate-in zoom-in-95 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] pointer-events-none"></div>

            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#141d30] relative z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" /> Instant Paystack Wallet Deposit
              </h3>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 relative z-10">
              <form onSubmit={handleNativePaystackDeposit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">
                    Deposit Amount (GH₵)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={depositAmountGHS}
                    onChange={(e) => setDepositAmountGHS(e.target.value)}
                    placeholder="e.g. 100.00"
                    className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-lg text-white font-black placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                  />
                  {depositAmountGHS && Number(depositAmountGHS) > 0 && (
                    <p className="text-xs text-amber-400 mt-2 font-mono">
                      ≈ {formatAmount(Number(depositAmountGHS))}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap mb-4">
                  {[50, 100, 250, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmountGHS(amt.toString())}
                      className="px-3 py-1.5 bg-[#141d30] border border-white/10 hover:border-amber-500/50 rounded-lg text-xs font-bold text-gray-300"
                    >
                      +GH₵ {amt}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">
                    Payment Channel
                  </label>
                  <select
                    value={depositMethod}
                    onChange={(e) => setDepositMethod(e.target.value)}
                    className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="PAYSTACK">Paystack Instant Checkout (MoMo / Card / Bank)</option>
                    <option value="MOBILE_MONEY">Mobile Money via Paystack (MTN / Telecel / AT)</option>
                  </select>
                </div>

                <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-xs text-gray-400">
                  Clicking <strong className="text-amber-400">Pay Now</strong> launches native Paystack checkout and verifies your transaction via <code className="text-emerald-400">/api/paystack/verify-deposit</code> before crediting your Available Balance.
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingDeposit || !depositAmountGHS || Number(depositAmountGHS) <= 0}
                  className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-black font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-amber-500/20"
                >
                  {isVerifyingDeposit ? (
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>
                    {isVerifyingDeposit
                      ? 'Verifying Deposit with Paystack...'
                      : `Pay Now (GH₵ ${Number(depositAmountGHS || 0).toFixed(2)})`}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Contest Modals */}
      {contestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] w-full max-w-md rounded-3xl overflow-hidden border border-cyan-500/30 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#141d30]">
              <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                {contestModalOpen === 'viral_100k' ? (
                  <>
                    <Video className="w-5 h-5 text-cyan-400" />
                    <span>100K Views Video Submission</span>
                  </>
                ) : contestModalOpen === 'sales_50' ? (
                  <>
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>50-Sales Executive Sprint Claim</span>
                  </>
                ) : contestModalOpen === 'sales_100' ? (
                  <>
                    <Trophy className="w-5 h-5 text-purple-400" />
                    <span>100-Sales Grand Producer Claim</span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5 text-sky-400" />
                    <span>Weekly Friday Top 3 Pool Entry</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setContestModalOpen(null)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-2 mb-4 text-center bg-black/40 border border-white/10 rounded-2xl p-3">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase block">Verified Sales</span>
                  <span className="text-sm font-black text-emerald-400">{totalSalesCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase block">This Week</span>
                  <span className="text-sm font-black text-sky-400">{weeklySalesCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase block">Affiliate ID</span>
                  <span className="text-xs font-mono font-bold text-amber-300">
                    {userAffiliateCode || 'N/A'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleContestSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contestFullName}
                    onChange={(e) => setContestFullName(e.target.value)}
                    placeholder={`${firstName} ${lastName}`.trim() || 'Your Full Name'}
                    className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">
                    Phone / WhatsApp Number (with code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={contestPhone}
                    onChange={(e) => setContestPhone(e.target.value)}
                    placeholder="+233..."
                    className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">
                    {contestModalOpen === 'viral_100k'
                      ? 'TikTok / Instagram Handle (@) *'
                      : 'TikTok / Instagram / Social Handle (Optional)'}
                  </label>
                  <input
                    type="text"
                    required={contestModalOpen === 'viral_100k'}
                    value={contestSocialHandle}
                    onChange={(e) => setContestSocialHandle(e.target.value)}
                    placeholder="@yourusername"
                    className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">
                    {contestModalOpen === 'viral_100k'
                      ? 'Direct TikTok / IG Video URL *'
                      : 'Proof Screenshot / Promo Link (Optional)'}
                  </label>
                  <input
                    type="url"
                    required={contestModalOpen === 'viral_100k'}
                    value={contestVideoUrl}
                    onChange={(e) => setContestVideoUrl(e.target.value)}
                    placeholder="https://tiktok.com/@... or https://instagram.com/reel/..."
                    className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5">
                    Payout MoMo / Bank Details & Verification Notes *
                  </label>
                  <input
                    type="text"
                    required
                    value={contestBankMomoDetails}
                    onChange={(e) => setContestBankMomoDetails(e.target.value)}
                    placeholder="e.g. MTN MoMo - 024XXXXXXX (Account Name)"
                    className="w-full bg-[#141d30] border border-white/10 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingContest}
                  className={`w-full py-4 mt-2 rounded-xl text-black font-black transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                    contestModalOpen === 'viral_100k'
                      ? 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                      : 'bg-amber-500 hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  }`}
                >
                  {isSubmittingContest ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting & Dispatching to Admin...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {contestModalOpen === 'viral_100k'
                          ? 'Submit Video Application'
                          : 'Submit Contest Entry / Claim'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* FIXED BOTTOM NAVIGATION BAR */}
      {/* ==================================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0b111e]/95 backdrop-blur-md border-t border-white/10 h-16 px-2 flex items-center overflow-x-auto no-scrollbar gap-1">
         {[
            { id: "dashboard", label: "Home", icon: BarChart3 },
            { id: "marketplace", label: "Market", icon: ShoppingBag },
            { id: "my_courses", label: "Courses", icon: Folder },
            { id: "links", label: "Links", icon: Share2 },
            { id: "vault", label: "Vault", icon: MessageSquare },
            { id: "exam", label: "Exam", icon: Award },
            { id: "contests", label: "Contests", icon: Trophy },
            { id: "payouts", label: "Payouts", icon: DollarSign },
            { id: "creator", label: "Creator", icon: Briefcase },
            { id: "calculator", label: "Calc", icon: Calculator },
            { id: "rules", label: "Rules", icon: ShieldCheck },
         ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as ActiveSection)}
                className={`flex flex-col items-center justify-center min-w-[64px] h-full gap-1 transition-all ${isActive ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""}`} />
                <span className={`text-[10px] font-medium ${isActive ? "font-bold" : ""}`}>{tab.label}</span>
              </button>
            )
         })}
      </nav>

      {/* Profile Sheet Modal */}
      {isProfileSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] w-full max-w-md rounded-3xl overflow-hidden border border-white/10 animate-in slide-in-from-bottom-4">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#141d30]">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs flex items-center justify-center">
                   {userInitials}
                 </div>
                 <div>
                   <h3 className="text-sm font-black text-white leading-tight">
                     {username ? `@${username}` : `${firstName} ${lastName}`.trim() || 'Account Menu'}
                   </h3>
                   <p className="text-[11px] text-gray-400 truncate max-w-[210px]">
                     {currentProfile?.email || pillar2Email} • <span className="text-emerald-400 font-mono">{userAffiliateCode}</span>
                   </p>
                 </div>
               </div>
               <button onClick={() => setIsProfileSheetOpen(false)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                 <X className="w-5 h-5 text-gray-400" />
               </button>
            </div>
            <div className="p-2 space-y-1">
               <button onClick={() => { setIsProfileSheetOpen(false); setActiveSettingsModal("profile"); }} className="w-full p-4 flex items-center gap-3 hover:bg-white/5 rounded-2xl transition-all">
                  <User className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-sm">Profile & Details</span>
               </button>
               <button onClick={() => { setIsProfileSheetOpen(false); setActiveSettingsModal("kyc"); }} className="w-full p-4 flex items-center gap-3 hover:bg-white/5 rounded-2xl transition-all">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-sm">Account Information / KYC</span>
               </button>
               <button onClick={() => { setIsProfileSheetOpen(false); setIsNotificationsOpen(true); }} className="w-full p-4 flex items-center gap-3 hover:bg-white/5 rounded-2xl transition-all">
                  <Bell className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-sm">Notifications</span>
               </button>
               <button onClick={() => { setIsProfileSheetOpen(false); setActiveSettingsModal("security"); }} className="w-full p-4 flex items-center gap-3 hover:bg-white/5 rounded-2xl transition-all">
                  <Key className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-sm">Security & Password</span>
               </button>
               <button onClick={() => { setIsProfileSheetOpen(false); setActiveSettingsModal("2fa"); }} className="w-full p-4 flex items-center gap-3 hover:bg-white/5 rounded-2xl transition-all">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-sm">2FA Authentication</span>
               </button>
               <button onClick={() => { setIsProfileSheetOpen(false); setActiveSettingsModal("support"); }} className="w-full p-4 flex items-center gap-3 hover:bg-white/5 rounded-2xl transition-all">
                  <HelpCircle className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-sm">Help & Support</span>
               </button>
               <div className="h-px bg-white/10 my-2 mx-2"></div>
               <button onClick={handlePillar2SignOut} className="w-full p-4 flex items-center gap-3 hover:bg-rose-500/10 rounded-2xl transition-all text-rose-400">
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold text-sm">Log Out / Sign Out</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Pillar 2 Help Bot (Silent Help Desk Window — Detached from Pillar 1 Store) */}
      <button
        onClick={() => {
          setIsAiBotOpen((prev) => !prev);
        }}
        className="fixed bottom-20 left-4 z-[9999] w-12 h-12 rounded-full bg-[#020202]/90 backdrop-blur-xl border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center hover:scale-110 transition-transform"
        title="Pillar 2 Help Desk"
      >
        💬
      </button>

      {isAiBotOpen && (
        <div className="fixed bottom-36 left-4 z-[9999] w-80 sm:w-96 bg-[#0b111e] border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[420px]">
          <div className="p-3.5 bg-[#111a2e] border-b border-white/10 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Pillar 2 Direct Help Desk
              </h4>
              <p className="text-[10px] text-gray-400">
                Messages go directly to the Admin Help Desk Inbox
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAiBotOpen(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-[180px] bg-black/40">
            {aiMessages.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">
                Type your question or support request below. Our Admin team reads every message in the Pillar 2 Help Desk Inbox.
              </p>
            ) : (
              aiMessages.map((m, idx) => (
                <div
                  key={idx}
                  className="ml-auto max-w-[85%] rounded-2xl px-3.5 py-2 bg-emerald-500/20 border border-emerald-500/30 text-xs text-white"
                >
                  {m.text}
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const text = aiInput.trim();
              if (!text) return;
              setAiInput('');
              setAiMessages((prev) => [...prev, { sender: 'user', text }]);
              try {
                await fetch('/api/admin/action', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'SUBMIT_P2_HELP_MESSAGE',
                    payload: {
                      userId: currentProfile?.id || null,
                      userEmail: currentProfile?.email || pillar2Email || '',
                      userName: `${firstName} ${lastName}`.trim() || username || 'Affiliate',
                      message: text,
                    },
                  }),
                });
              } catch {}
            }}
            className="p-2.5 border-t border-white/10 bg-[#0b111e] flex items-center gap-2"
          >
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Write a message to Admin..."
              className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition"
            >
              Send
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
