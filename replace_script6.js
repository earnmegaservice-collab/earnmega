const fs = require('fs');
let content = fs.readFileSync('components/home/HorPalLandingGateway.tsx', 'utf8');

// Replace Pillar 1 Card Background
const oldPillar1 = `          <div
            onClick={onEnterPillar1}
            className="group relative flex flex-col justify-between p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-black border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.18)] hover:shadow-[0_0_80px_rgba(245,158,11,0.3)] transition-all cursor-pointer overflow-hidden"
          >`;
const newPillar1 = `          <div
            onClick={onEnterPillar1}
            className="group relative flex flex-col justify-between p-8 rounded-3xl bg-[#050508] border border-[#E9B949]/40 shadow-[0_0_40px_rgba(233,185,73,0.15)] hover:shadow-[0_0_60px_rgba(233,185,73,0.25)] transition-all cursor-pointer overflow-hidden"
          >`;

// Replace Pillar 2 Card Background
const oldPillar2 = `          <div className="relative flex flex-col justify-between p-8 rounded-3xl bg-zinc-950/70 border border-emerald-500/20 opacity-90 overflow-hidden">`;
const newPillar2 = `          <div className="relative flex flex-col justify-between p-8 rounded-3xl bg-[#1A1A24]/70 border border-white/10 opacity-90 overflow-hidden shadow-xl">`;

// Replace How It Works Title style
const oldHowTitle = `<h2 className="text-3xl sm:text-5xl font-black mb-4">How Make Friends & Earn Works</h2>`;
const newHowTitle = `<h2 className="text-3xl sm:text-5xl font-serif font-black mb-4">How Make Friends & Earn Works</h2>`;

// Replace How It Works Connection Line
const oldLine = `<div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-amber-500/5 via-amber-500/50 to-amber-500/5 z-0"></div>`;
const newLine = `<div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#E9B949]/50 to-transparent z-0"></div>`;

// Replace How It Works Number Circles
const oldCircles = `              <div className="w-24 h-24 rounded-full bg-black border-4 border-[#050508] shadow-[0_0_0_2px_rgba(245,158,11,0.3)] flex items-center justify-center text-3xl font-black text-amber-500 mb-6 relative">
                {item.step}
                <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl -z-10"></div>
              </div>`;
const newCircles = `              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#050508] border border-[#E9B949]/40 shadow-[0_0_0_4px_rgba(233,185,73,0.1)] flex items-center justify-center text-2xl sm:text-3xl font-serif font-black text-[#E9B949] mb-6 relative">
                {item.step}
                <div className="absolute inset-0 rounded-full bg-[#E9B949]/10 blur-xl -z-10"></div>
              </div>`;

content = content.replace(oldPillar1, newPillar1)
                 .replace(oldPillar2, newPillar2)
                 .replace(oldHowTitle, newHowTitle)
                 .replace(oldLine, newLine)
                 .replace(oldCircles, newCircles);

fs.writeFileSync('components/home/HorPalLandingGateway.tsx', content, 'utf8');
console.log('Restyled Pillar Cards and How It Works.');
