import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Percent, CreditCard, CalendarDays, RefreshCcw, AlertTriangle, Award, LifeBuoy } from 'lucide-react';

export default function RulesPage() {
  const rules = [
    {
      icon: <Percent className="w-6 h-6 text-emerald-400" />,
      title: "Unique Link Attribution & 50% Commission",
      desc: "Every product in the HorPal Marketplace operates on a strict 50% commission split. Sales are attributed using an iron-clad first-click cookie & session tracking system. If your unique code is locked at checkout, you get credited instantly."
    },
    {
      icon: <CreditCard className="w-6 h-6 text-indigo-400" />,
      title: "Direct Entry vs. Product Bundle Rules",
      desc: "The standard HorPal Pillar 2 Affiliate App access is a one-time GH₵ 90 direct enrollment fee. However, purchasing any Creator Product on the marketplace (which includes the GH₵ 90 bundle fee) automatically unlocks lifetime Affiliate Access along with the specific product's course material."
    },
    {
      icon: <CalendarDays className="w-6 h-6 text-amber-400" />,
      title: "Friday Payout Window & Minimum Threshold",
      desc: "Payouts are exclusively processed on Fridays (GMT). To be eligible for a withdrawal via Bank Transfer, Mobile Money, or USDT TRC20, your available balance must meet the strict minimum threshold of GH₵ 90."
    },
    {
      icon: <RefreshCcw className="w-6 h-6 text-rose-400" />,
      title: "Refund & Chargeback Clawback Policy",
      desc: "Any transaction flagged as fraudulent by Paystack or refunded to a buyer will result in an immediate commission clawback from the referring affiliate's balance. Accounts with high chargeback rates will be permanently suspended."
    },
    {
      icon: <AlertTriangle className="w-6 h-6 text-orange-400" />,
      title: "Anti-Spam & Ethical Marketing Code",
      desc: "Affiliates must not use spam tactics, unsolicited mass emailing, or false income guarantees to promote products. You must only use honest marketing copy. Misleading potential buyers violates our terms."
    },
    {
      icon: <Award className="w-6 h-6 text-cyan-400" />,
      title: "5-Step Examination & 90% Certification",
      desc: "To earn the Official HorPal Certificate of Completion, affiliates must pass the 5-Step Digital Certification Exam. A strict passing grade of 90% (9 out of 10) is required for each step to progress."
    }
  ];

  return (
    <div className="min-h-screen bg-[#050811] text-white font-sans selection:bg-emerald-500/30">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-24 space-y-16 relative z-10">

        {/* Header */}
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <ShieldCheck className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-emerald-400 via-white to-emerald-400 bg-clip-text text-transparent">
            Official Rules & Regulations
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Governance, Payout Policies, and Ethical Standards for HorPal Affiliates & Marketplace Vendors.
          </p>
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rules.map((rule, i) => (
            <div key={i} className="bg-[#0b111e]/80 backdrop-blur-xl border border-white/10 hover:border-emerald-500/30 transition-all rounded-3xl p-8">
              <div className="w-12 h-12 rounded-2xl bg-[#141d30] flex items-center justify-center mb-6">
                {rule.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-4">{rule.title}</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                {rule.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Support Box */}
        <div className="bg-gradient-to-br from-[#141d30] to-[#0f172a] border border-white/10 rounded-3xl p-8 md:p-12 text-center max-w-3xl mx-auto">
          <LifeBuoy className="w-12 h-12 text-indigo-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Official Support Contacts</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            If you have questions regarding payouts, policy violations, or technical platform issues, reach out to our official support channels:
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <span className="py-2 px-4 rounded-xl bg-white/5 border border-white/10 font-mono text-sm">horpalservice@gmail.com</span>
            <span className="py-2 px-4 rounded-xl bg-white/5 border border-white/10 font-mono text-sm">geestablish@gmail.com</span>
            <span className="py-2 px-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] font-mono text-sm flex items-center gap-2">
              WhatsApp: 0534671381
            </span>
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center mt-12">
          <Link href="/affiliate" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium">
            <span>←</span> Back to HorPal Affiliate Hub
          </Link>
        </div>
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full mix-blend-screen" />
      </div>
    </div>
  );
}
