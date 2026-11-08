"use client";
import React from 'react';
import Link from 'next/link';

export default function WhitelistPage() {
  return (
    <div className="min-h-screen bg-[#050811] text-white font-sans selection:bg-emerald-500/30">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-24 space-y-12 relative z-10">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-emerald-400 via-white to-emerald-400 bg-clip-text text-transparent">
            Creator Whitelist Onboarding
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Official HorPal Creator & Vendor Whitelist Application. Submit your high-converting digital product to our marketplace and tap into our network of elite affiliates.
          </p>
        </div>

        <div className="bg-[#0b111e]/80 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-8 md:p-12 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">1</span>
            Requirements to Apply
          </h2>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Read the requirements below and send your complete submission package manually to
            <span className="font-mono text-emerald-400 mx-2">horpalservice@gmail.com</span>.
            After our QA Board reviews and approves your product, we will reach out to you with your congratulations message and vendor listing activation link.
          </p>

          <ul className="space-y-4 mb-12">
            {[
              "Creator Full Name, Brand Name, Country & WhatsApp Phone Number",
              "Digital Product / Course Title & Category",
              "Proposed Retail Price in GH₵ (minimum GH₵ 100) & Affiliate Commission Split (minimum 50% required)",
              "High-Converting Sales Page URL (or request for HorPal built-in sales page)",
              "Google Drive Course Folder / Delivery URL for Quality Assurance inspection",
              "Summary of modules & student transformation"
            ].map((req, i) => (
              <li key={i} className="flex gap-4 items-start bg-[#141d30] p-4 rounded-xl border border-white/5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400 text-xs font-bold">✓</div>
                <span className="text-sm md:text-base text-gray-300">{req}</span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText('horpalservice@gmail.com');
                alert('Email address copied to clipboard!');
              }}
              className="w-full py-4 px-6 rounded-2xl bg-[#141d30] hover:bg-[#1b263f] border border-white/10 text-white font-bold transition-all flex items-center justify-center gap-3"
            >
              Copy Email Address
            </button>
            <a
              href="mailto:horpalservice@gmail.com?subject=HorPal%20Creator%20Whitelist%20Application&body=Hello%20HorPal%20Team%2C%0A%0AHere%20is%20my%20Whitelist%20Application%3A%0A%0A1.%20Creator%20Name%2FBrand%20%26%20WhatsApp%3A%20%0A2.%20Product%20Title%20%26%20Category%3A%20%0A3.%20Price%20(GH%E2%82%B5)%20%26%20Commission%20Split%3A%20%0A4.%20Sales%20Page%20URL%3A%20%0A5.%20Google%20Drive%20Access%20Link%3A%20%0A6.%20Summary%3A%20%0A%0AThank%20you."
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black transition-all flex items-center justify-center gap-3"
            >
              Launch Email App ✉️
            </a>
            <a
              href="https://wa.me/233534671381"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-[#25D366] font-bold transition-all flex items-center justify-center gap-3 md:col-span-2"
            >
              Chat on WhatsApp (0534671381)
            </a>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link href="/affiliate" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium">
            <span>←</span> Back to HorPal Affiliate Hub
          </Link>
        </div>
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>
    </div>
  );
}
