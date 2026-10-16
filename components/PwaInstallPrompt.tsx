"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <AnimatePresence>
      {isInstallable && (
        <motion.div
          key="pwa-install-prompt"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pb-8 bg-neutral-900/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-3xl"
        >
          <div className="flex items-center gap-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 p-[2px] shadow-lg flex-shrink-0">
              <img src="/icon-192x192.png" alt="EarnMega" className="w-full h-full rounded-xl object-cover" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg">Install EarnMega</h3>
              <p className="text-neutral-400 text-xs">Add to home screen for full-screen view, push notifications, and faster speeds.</p>
            </div>
            <button
              onClick={handleInstallClick}
              className="px-5 py-2.5 bg-white text-black font-bold rounded-full active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            >
              Get
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
