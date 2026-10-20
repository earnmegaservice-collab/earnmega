import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function VerifiedTick() {
  return (
    <motion.div
      animate={{ boxShadow: ["0px 0px 5px #06b6d4", "0px 0px 15px #06b6d4", "0px 0px 5px #06b6d4"] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-600 p-[2px] ml-1 shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
      title="Verified User"
    >
      <Check className="w-3 h-3 text-white font-bold stroke-2" />
    </motion.div>
  );
}
