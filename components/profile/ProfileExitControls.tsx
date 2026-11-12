'use client';

import React from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface ProfileExitControlsProps {
  onClose: () => void;
  backLabel?: string;
  positioning?: 'fixed' | 'sticky';
  zIndexClass?: string;
}

/**
 * Renders unmistakable, high-contrast 44x44+ top-left Back and top-right Close controls
 * for every public profile view across Explore, Find, Chat List, Radar, and Group Info.
 */
export default function ProfileExitControls({
  onClose,
  backLabel = 'Back',
  positioning = 'fixed',
  zIndexClass = 'z-50',
}: ProfileExitControlsProps) {
  const posClass =
    positioning === 'sticky'
      ? 'sticky top-0 left-0 right-0'
      : 'fixed top-0 left-0 right-0';

  return (
    <div
      className={`${posClass} ${zIndexClass} pointer-events-none flex items-center justify-between px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Go back"
        className="pointer-events-auto min-w-[44px] min-h-[44px] px-4 py-2 rounded-full bg-black/80 hover:bg-black active:scale-95 text-white border border-white/25 backdrop-blur-xl shadow-[0_6px_24px_rgba(0,0,0,0.75)] flex items-center justify-center gap-1.5 text-sm font-bold transition cursor-pointer touch-manipulation"
      >
        <ArrowLeft size={18} strokeWidth={2.5} />
        <span>{backLabel}</span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close profile"
        className="pointer-events-auto w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-black/80 hover:bg-black active:scale-95 text-white border border-white/25 backdrop-blur-xl shadow-[0_6px_24px_rgba(0,0,0,0.75)] flex items-center justify-center transition cursor-pointer touch-manipulation"
      >
        <X size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
}
