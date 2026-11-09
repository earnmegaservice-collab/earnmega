const fs = require('fs');
let content = fs.readFileSync('components/home/HorPalLandingGateway.tsx', 'utf8');

const anchor = `      {/* 4. DUAL-PILLAR COMMAND DECK */}
      <section id="pillars" className="py-24 px-4 md:px-8 max-w-7xl mx-auto">`;

const newHighlights = `      {/* 3.5 HIGHLIGHT CARDS (Relocated Promo Text) */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promoTextBlocks.map((block, idx) => (
            <div key={idx} className="p-8 rounded-3xl bg-[#1A1A24] border border-[#E9B949]/20 hover:border-[#E9B949]/50 transition-colors shadow-lg relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-[#E9B949]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="inline-block px-3 py-1 bg-white/5 border border-[#E9B949]/30 rounded-full text-[10px] font-bold tracking-widest text-[#E9B949] mb-6 uppercase">
                {block.badge}
              </span>
              <h3 className="text-xl sm:text-2xl font-serif font-black mb-3 text-white leading-snug">
                {block.headline}
              </h3>
              <p className="text-white/60 text-sm sm:text-base font-sans leading-relaxed">
                {block.subtitle}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. DUAL-PILLAR COMMAND DECK */}
      <section id="pillars" className="py-12 md:py-24 px-4 md:px-8 max-w-7xl mx-auto">`;

content = content.replace(anchor, newHighlights);
fs.writeFileSync('components/home/HorPalLandingGateway.tsx', content, 'utf8');
console.log('Promo text cards inserted.');
