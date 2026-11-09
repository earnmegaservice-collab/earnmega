const fs = require('fs');
let content = fs.readFileSync('components/home/HorPalLandingGateway.tsx', 'utf8');

// Replace "Why Entry Pass" background container
const oldWhyContainer = `      <section id="why" className="py-24 bg-black/50 border-y border-white/5 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black mb-6">Built for Quality, Powered by Paid AI & Real Human Workers.</h2>`;
const newWhyContainer = `      <section id="why" className="py-24 bg-[#0D0D14] border-y border-white/5 px-4 md:px-8 relative">
        <div className="absolute inset-0 bg-[url('https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-serif font-black mb-6">Built for Quality, Powered by Paid AI & Real Human Workers.</h2>`;

// Replace Fund Allocation section
const oldFund = `          <div className="bg-zinc-900/80 p-8 rounded-3xl border border-white/10">
            <h4 className="text-sm font-bold text-white/80 mb-6 uppercase tracking-wider text-center">Fund Allocation Breakdown</h4>
            <div className="h-4 rounded-full bg-zinc-800 flex overflow-hidden mb-6">
              <div className="h-full bg-blue-500" style={{ width: '35%' }} title="35% Enterprise AI Engines & High-Speed Cloud Servers"></div>
              <div className="h-full bg-amber-500" style={{ width: '30%' }} title="30% Paid Human Workers, Support & Safety Moderators"></div>
              <div className="h-full bg-emerald-500" style={{ width: '25%' }} title="25% Creator Rewards, Bonuses & Community Ecosystem"></div>
              <div className="h-full bg-rose-500" style={{ width: '10%' }} title="10% Identity Verification & Bank-Grade Security"></div>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-white/60 font-medium">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span>35% AI & Cloud Servers</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span>30% Human Workers & Support</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span>25% Creator Rewards Ecosystem</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500"></span>10% Security & Verification</div>
            </div>
          </div>`;

const newFund = `          <div className="bg-[#1A1A24] p-8 sm:p-12 rounded-3xl border border-white/5 shadow-2xl">
            <h4 className="text-sm font-bold text-white/80 mb-8 uppercase tracking-widest text-center">Fund Allocation Breakdown</h4>
            <div className="h-4 sm:h-5 rounded-full bg-black flex overflow-hidden mb-8 shadow-inner ring-1 ring-white/10">
              <div className="h-full bg-[#A8741A] transition-all duration-1000 ease-out" style={{ width: '35%' }} title="35% Enterprise AI Engines & High-Speed Cloud Servers"></div>
              <div className="h-full bg-[#E9B949] transition-all duration-1000 ease-out" style={{ width: '30%' }} title="30% Paid Human Workers, Support & Safety Moderators"></div>
              <div className="h-full bg-[#F6E3A1] transition-all duration-1000 ease-out" style={{ width: '25%' }} title="25% Creator Rewards, Bonuses & Community Ecosystem"></div>
              <div className="h-full bg-[#5D6B78] transition-all duration-1000 ease-out" style={{ width: '10%' }} title="10% Identity Verification & Bank-Grade Security"></div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs sm:text-sm text-white/70 font-medium">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#A8741A] shadow-sm"></span>35% AI & Cloud Servers</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#E9B949] shadow-sm"></span>30% Human Workers & Support</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#F6E3A1] shadow-sm"></span>25% Creator Rewards Ecosystem</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#5D6B78] shadow-sm"></span>10% Security & Verification</div>
            </div>
          </div>`;

content = content.replace(oldWhyContainer, newWhyContainer)
                 .replace(oldFund, newFund);

fs.writeFileSync('components/home/HorPalLandingGateway.tsx', content, 'utf8');
console.log('Restyled Why Entry Pass and Fund Allocation.');
