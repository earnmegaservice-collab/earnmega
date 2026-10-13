"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share, X } from "lucide-react";
import { useIOSDetection } from "../hooks/useIOSDetection";

export function SmartInstallBanner() {
  const { shouldShowBanner } = useIOSDetection();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if it's iOS, not standalone, and user hasn't dismissed it
    if (shouldShowBanner) {
      const hasDismissed = localStorage.getItem("hasDismissedIOSBanner");
      if (!hasDismissed) {
        setIsVisible(true);
      }
    }
  }, [shouldShowBanner]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("hasDismissedIOSBanner", "true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-4 left-4 right-4 z-50 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-white font-bold text-lg">Install EarnMega</h3>
            <button
              onClick={handleDismiss}
              className="text-white/50 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            To install this app on your iPhone: tap the Share button{" "}
            <span className="inline-flex items-center justify-center align-middle mx-1 bg-white/10 rounded p-1">
              <Share size={14} className="text-white" />
            </span>
            below and select 'Add to Home Screen'.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
