import React from 'react';
import { motion } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';

interface MediaPreviewProps {
  previewUrl: string;
  caption: string;
  setCaption: (caption: string) => void;
  isUploading: boolean;
  cancelPreview: () => void;
  handleSend: () => void;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  previewUrl,
  caption,
  setCaption,
  isUploading,
  cancelPreview,
  handleSend,
}) => {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-[99999] flex flex-col bg-neutral-950/95 backdrop-blur-[50px] overflow-hidden">
      {/* Ambient Studio Lighting (Picks up color from the image) */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent mix-blend-overlay pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex justify-between items-center p-6 pt-14">
        <button onClick={cancelPreview} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.05)] active:scale-90 transition-all">
          <X size={24} strokeWidth={2}/>
        </button>
        <span className="text-white/50 text-xs font-black tracking-[0.3em] uppercase">Pro Studio</span>
        <div className="w-12 h-12" /> {/* Spacer */}
      </div>

      {/* Media Canvas with Holographic Shadow */}
      <div className="relative flex-1 flex items-center justify-center p-6">
        <motion.img
          layoutId="media-preview"
          src={previewUrl}
          className="max-h-full max-w-full rounded-[2rem] object-contain shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/10 relative z-10"
        />
        <div className="absolute inset-0 bg-blue-500/20 blur-[120px] rounded-full scale-75 opacity-50 pointer-events-none" />
      </div>

      {/* Floating Neumorphic Caption Bar */}
      <div className="relative z-20 p-8 pb-12 bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="flex items-end gap-4 p-2 bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <textarea
            value={caption} onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a premium caption..."
            className="w-full bg-transparent text-white placeholder-white/30 px-6 py-4 outline-none resize-none max-h-32 text-[15px] font-medium leading-relaxed"
            rows={1}
          />
          <button onClick={handleSend} disabled={isUploading} className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-[0_0_40px_rgba(16,185,129,0.5)] active:scale-90 transition-all flex-shrink-0 m-1">
            {isUploading ? <Loader2 className="animate-spin text-white" size={24}/> : <Send className="ml-1" size={22} strokeWidth={2.5}/>}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
