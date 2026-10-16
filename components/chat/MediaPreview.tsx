import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';

interface MediaPreviewProps {
  file: File;
  onClose: () => void;
  onSend: (file: File, caption: string) => void;
  isUploading: boolean;
  uploadProgress: number;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  file,
  onClose,
  onSend,
  isUploading,
  uploadProgress
}) => {
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isVideo = file.type.startsWith('video/');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleSend = () => {
    onSend(file, caption);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-[100] flex flex-col bg-neutral-950/95 backdrop-blur-3xl h-[100dvh]"
      >
        {/* Header */}
        <header className="flex items-center justify-between p-4 shrink-0 bg-black/40 border-b border-white/10">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
          <h2 className="text-white font-bold text-lg">Preview</h2>
          <div className="w-10"></div> {/* Spacer for centering */}
        </header>

        {/* Media Container */}
        <main className="flex-1 overflow-hidden flex items-center justify-center p-4 relative">
          {previewUrl && (
            isVideo ? (
              <video
                src={previewUrl}
                controls
                autoPlay
                playsInline
                loop
                className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain border border-white/10"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain border border-white/10"
              />
            )
          )}

          {/* Upload Progress Overlay */}
          {isUploading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl m-4">
              <div className="w-24 h-24 border-4 border-white/20 border-t-amber-500 rounded-full animate-spin mb-4" />
              <div className="text-amber-500 font-bold text-xl drop-shadow-md">{uploadProgress}%</div>
              <p className="text-white/70 text-sm mt-2 font-medium">Uploading Media...</p>
            </div>
          )}
        </main>

        {/* Caption Input Area */}
        <footer className="p-4 bg-black/60 border-t border-white/10 shrink-0 pb-safe">
          <div className="flex items-end gap-3 max-w-2xl mx-auto w-full">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isUploading}
              placeholder="Add a caption..."
              className="flex-1 bg-white/10 border border-white/20 rounded-3xl px-5 py-3.5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none max-h-32 text-base backdrop-blur-md shadow-inner transition-all"
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={isUploading}
              className="w-14 h-14 shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:grayscale transition-all"
            >
              <Send size={24} className="ml-1" />
            </motion.button>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
};
