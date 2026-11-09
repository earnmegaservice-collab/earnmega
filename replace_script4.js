const fs = require('fs');
let content = fs.readFileSync('components/home/HorPalLandingGateway.tsx', 'utf8');

const oldTicker = `        {/* 3. LIVE SOCIAL PROOF TICKER */}
        <div className="mt-6 py-3 px-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm overflow-hidden flex whitespace-nowrap">
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
            className="flex gap-12 items-center text-sm font-medium text-amber-200/80 tracking-wide"
          >
            <span>⚡ 100% Bot-Free Verified Community</span>
            <span>💎 Real-Time Live Arena Gift Rewards</span>
            <span>🤖 Powered by Enterprise AI + 24/7 Human Specialists</span>
            <span>🔒 Secured & Verified Global Infrastructure</span>
            <span>⚡ 100% Bot-Free Verified Community</span>
            <span>💎 Real-Time Live Arena Gift Rewards</span>
          </motion.div>
        </div>
      </section>`;

const newButtonsAndTicker = `        {/* 2.1 PILLAR ACCESS BUTTONS */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-2xl mx-auto z-10 relative">
          <button
            onClick={onEnterPillar1}
            className="group relative w-full sm:flex-1 min-h-[56px] rounded-full bg-[#0A0A0F]/80 backdrop-blur-xl border border-[#E9B949]/30 hover:border-[#E9B949] flex items-center justify-center gap-3 px-6 py-3 transition-all duration-300 active:scale-[0.98] shadow-[0_0_15px_rgba(233,185,73,0.1)] hover:shadow-[0_0_25px_rgba(233,185,73,0.2)] overflow-hidden"
          >
            {/* Sweep effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"></div>

            <div className="w-8 h-8 rounded-full border border-[#E9B949]/40 bg-[#E9B949]/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E9B949" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <span className="font-sans font-bold text-white text-base tracking-wide">Global Chat</span>
          </button>

          <button
            onClick={() => { localStorage.setItem('horpal_target_pillar', '2'); window.location.href = '/affiliate'; }}
            className="group relative w-full sm:flex-1 min-h-[56px] rounded-full bg-[#0A0A0F]/80 backdrop-blur-xl border border-emerald-500/30 hover:border-emerald-500 flex items-center justify-center gap-3 px-6 py-3 transition-all duration-300 active:scale-[0.98] shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] overflow-hidden"
          >
             {/* Sweep effect */}
             <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"></div>

            <div className="w-8 h-8 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </div>
            <span className="font-sans font-bold text-white text-base tracking-wide">Affiliate Marketing</span>
          </button>
        </div>

        {/* 3. LIVE SOCIAL PROOF TICKER */}
        <div className="mt-8 py-3 px-6 rounded-2xl bg-[#1A1A24]/40 border border-white/5 backdrop-blur-sm overflow-hidden flex whitespace-nowrap hover:bg-[#1A1A24]/60 transition-colors">
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
            whileHover={{ animationPlayState: 'paused' }}
            className="flex gap-12 items-center text-sm font-medium text-[#E9B949]/80 tracking-wide font-sans"
          >
            <span>⚡ 100% Bot-Free Verified Community</span>
            <span>💎 Real-Time Live Arena Gift Rewards</span>
            <span>🤖 Powered by Enterprise AI + 24/7 Human Specialists</span>
            <span>🔒 Secured & Verified Global Infrastructure</span>
            <span>⚡ 100% Bot-Free Verified Community</span>
            <span>💎 Real-Time Live Arena Gift Rewards</span>
          </motion.div>
        </div>
      </section>`;

content = content.replace(oldTicker, newButtonsAndTicker);
fs.writeFileSync('components/home/HorPalLandingGateway.tsx', content, 'utf8');
console.log('Buttons inserted.');
