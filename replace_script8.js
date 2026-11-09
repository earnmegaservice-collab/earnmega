const fs = require('fs');
let content = fs.readFileSync('components/home/HorPalLandingGateway.tsx', 'utf8');

// Replace FAQ Header
const oldFaqHeader = `<h2 className="text-3xl sm:text-5xl font-black mb-4">Why HorPal Beats Ordinary Free Social Apps</h2>`;
const newFaqHeader = `<h2 className="text-3xl sm:text-5xl font-serif font-black mb-4">Why HorPal Beats Ordinary Free Social Apps</h2>`;

// Replace Pillar 1 Comparison Card
const oldCompCard = `            {/* HorPal */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1 bg-amber-500 text-black text-[10px] font-black tracking-widest rounded-bl-xl">ELITE STANDARD</div>
              <h3 className="text-xl font-bold text-amber-400 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">✓</span>`;
const newCompCard = `            {/* HorPal */}
            <div className="p-8 rounded-3xl bg-[#1A1A24] border border-[#E9B949] relative overflow-hidden shadow-[0_0_30px_rgba(233,185,73,0.15)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#E9B949]/5 to-transparent pointer-events-none"></div>
              <div className="absolute top-0 right-0 px-4 py-1 bg-[#E9B949] text-black text-[10px] font-black tracking-widest rounded-bl-xl shadow-sm">ELITE STANDARD</div>
              <h3 className="text-xl font-bold text-[#E9B949] mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#E9B949]/20 flex items-center justify-center text-[#E9B949]">✓</span>`;

// Replace FAQ item styling
const oldFaqItem = `<div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10">`;
const newFaqItem = `<div key={i} className="p-6 rounded-2xl bg-[#1A1A24] border border-[#E9B949]/30 hover:border-[#E9B949]/50 transition-colors cursor-pointer group">`;

// Add chevron to FAQ question (Note: lucide-react ChevronDown needs to be imported, but we can use SVG to avoid modifying imports if ChevronDown isn't there, wait, lucide-react is imported at the top? Let's check imports first. Actually, ChevronLeft, ChevronRight are. It's safer to use an SVG to not mess up imports).
const oldFaqTitle = `<h4 className="text-lg font-bold text-white mb-2">{faq.q}</h4>`;
const newFaqTitle = `<h4 className="text-lg font-bold text-white mb-2 flex justify-between items-center group-hover:text-[#E9B949] transition-colors">{faq.q} <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#E9B949]/50 group-hover:text-[#E9B949]"><polyline points="6 9 12 15 18 9"></polyline></svg></h4>`;

// Replace Final CTA
const oldCta = `          {/* Final CTA */}
          <div className="p-12 rounded-3xl bg-gradient-to-r from-amber-600/20 via-pink-600/20 to-purple-600/20 border border-amber-500/30 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent opacity-50 blur-2xl"></div>
            <h2 className="text-3xl sm:text-4xl font-black mb-6 relative z-10">Ready to Join the Elite Network?</h2>
            <button
              onClick={onEnterPillar1}
              className="relative z-10 px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-lg shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-105 transition-transform"
            >
              Start Now — Enter Make Friends & Earn &rarr;
            </button>
          </div>`;

const newCta = `          {/* Final CTA */}
          <div className="p-12 rounded-3xl bg-[#1A1A24] border border-[#E9B949]/40 text-center relative overflow-hidden shadow-[0_0_50px_rgba(233,185,73,0.15)]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#E9B949]/20 via-transparent to-transparent opacity-60 blur-2xl"></div>
            <h2 className="text-3xl sm:text-4xl font-serif font-black mb-6 relative z-10 text-white">Ready to Join the Elite Network?</h2>
            <button
              onClick={onEnterPillar1}
              className="relative z-10 px-8 py-4 rounded-full bg-[#E9B949] hover:bg-[#F6E3A1] text-black font-black text-lg shadow-[0_0_30px_rgba(233,185,73,0.4)] hover:shadow-[0_0_40px_rgba(233,185,73,0.6)] hover:scale-105 transition-all duration-300"
            >
              Start Now — Enter Make Friends & Earn &rarr;
            </button>
          </div>`;

content = content.replace(oldFaqHeader, newFaqHeader)
                 .replace(oldCompCard, newCompCard)
                 .replace(new RegExp(oldFaqItem.replace(/[.*+?^$\{key\}\(\)|\[\]\\]/g, '\\$&'), 'g'), newFaqItem)
                 .replace(new RegExp(oldFaqTitle.replace(/[.*+?^$\{key\}\(\)|\[\]\\]/g, '\\$&'), 'g'), newFaqTitle)
                 .replace(oldCta, newCta);

fs.writeFileSync('components/home/HorPalLandingGateway.tsx', content, 'utf8');
console.log('Restyled Comparison, FAQ, and Final CTA.');
