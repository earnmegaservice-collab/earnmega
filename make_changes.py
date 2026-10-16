import re

with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# We need to apply all 6 patches cleanly again.

# Patch 1: Imports & Types
content = content.replace(
    "import { Camera, Mic, Gift, Send, Check, CheckCheck, Clock, Menu, Play, Pause, X, Store, Lock, EyeOff, Video, Phone, Users } from 'lucide-react';",
    "import { Camera, Mic, Gift, Send, Check, CheckCheck, Clock, Menu, Play, Pause, X, Store, Lock, EyeOff, Video, Phone, Users, Plus, Image as ImageIcon } from 'lucide-react';"
)
content = content.replace(
    "  giftCost?: number;\n}",
    "  giftCost?: number;\n  mediaType?: 'image' | 'video';\n  videoUrl?: string;\n}"
)
content = content.replace(
    "const MessageForwardModal = dynamic(() => import(\"./MessageForwardModal\"), { ssr: false });",
    "const MessageForwardModal = dynamic(() => import(\"./MessageForwardModal\"), { ssr: false });\nimport { MediaPreview } from './MediaPreview';"
)
content = content.replace(
    "  const [messageToForward, setMessageToForward] = useState<Message | null>(null);",
    "  const [messageToForward, setMessageToForward] = useState<Message | null>(null);\n  \n  // Phase 3: Pro Media Studio States\n  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);\n  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);\n  const [uploadProgress, setUploadProgress] = useState(0);"
)

# Patch 2: Handlers
camera_click_old = """  const handleCameraClick = () => {
    if (handleMediaClick()) {
      fileInputRef.current?.click();
    }
  };"""
camera_click_new = """  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!handleMediaClick()) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/') && file.size > 50 * 1024 * 1024) {
        toast.error("Video exceeds 50MB limit");
        return;
      }
      setSelectedMediaFile(file);
      setIsAttachmentOpen(false);
    }
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleCameraClick = () => {
    if (handleMediaClick()) {
      setIsAttachmentOpen(prev => !prev);
    }
  };"""
content = content.replace(camera_click_old, camera_click_new)

# Patch 3: Render (Button & Drawer)
drawer_old = "{/* Input Area */}\n      <footer"
drawer_new = """{/* Attachment Pop-Up Drawer */}
      <AnimatePresence>
        {isAttachmentOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-[90px] left-4 bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-3 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex gap-4 z-40"
          >
            <label className="flex flex-col items-center gap-1 cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 group-hover:bg-blue-500/40 flex items-center justify-center transition-all text-blue-400">
                <Camera size={24} />
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Camera</span>
              <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleMediaSelect} />
            </label>
            <label className="flex flex-col items-center gap-1 cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 group-hover:bg-purple-500/40 flex items-center justify-center transition-all text-purple-400">
                <ImageIcon size={24} />
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Gallery</span>
              <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <footer"""
content = content.replace(drawer_old, drawer_new)

button_old = """            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={handleCameraClick}
              disabled={isUploading}
              className="w-10 h-10 shrink-0 text-gray-400 hover:text-gray-200 bg-gray-900/50 hover:bg-gray-700/80 rounded-full flex items-center justify-center transition-all backdrop-blur-sm shadow-sm disabled:opacity-50"
              aria-label="Upload Image"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-t-blue-500 border-gray-400 rounded-full animate-spin"></div>
              ) : (
                <Camera size={20} />
              )}
            </motion.button>"""
button_new = """            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={handleCameraClick}
              disabled={isUploading}
              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all backdrop-blur-sm shadow-sm disabled:opacity-50 ${isAttachmentOpen ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-gray-200 bg-gray-900/50 hover:bg-gray-700/80'}`}
              aria-label="Attach Media"
            >
              <Plus size={20} className={`transition-transform duration-300 ${isAttachmentOpen ? 'rotate-45' : ''}`} />
            </motion.button>"""
content = content.replace(button_old, button_new)


# Patch 4: Compress Image Function
compression_code = """
  // Phase 3: Client-Side Image Compression
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1920;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('Canvas to Blob failed'));
                }
              },
              'image/webp',
              0.8 // quality
            );
          } else {
            reject(new Error('Failed to get canvas context'));
          }
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const toggleRecording = async () => {"""
content = content.replace("  const toggleRecording = async () => {", compression_code)

# Patch 5: Media Sending Logic
media_send_logic = """  const handleSendMedia = async (file: File, caption: string) => {
    if (!user || !currentOtherUserProfile) return;
    setUploadProgress(0);

    try {
      let fileToUpload: File | Blob = file;
      const isVideo = file.type.startsWith('video/');
      const mediaType = isVideo ? 'video' : 'image';

      if (!isVideo) {
         fileToUpload = await compressImage(file);
      }

      const fileExt = isVideo ? file.name.split('.').pop() || 'mp4' : 'webp';
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${fileName}`;

      const progressInterval = setInterval(() => {
         setUploadProgress(prev => {
            if (prev >= 95) {
               clearInterval(progressInterval);
               return 95;
            }
            return prev + 5;
         });
      }, 100);

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, fileToUpload);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      const newMessage: Message = {
        id: uuidv4(),
        text: caption,
        ...(isVideo ? {} : { imageUrl: publicUrl }),
        sender: 'user',
        timestamp: new Date(),
        status: 'sent',
        reactions: [],
        isViewOnce: false,
        viewedBy: [],
        messageType: 'text',
        mediaType: mediaType,
        ...(isVideo ? { videoUrl: publicUrl } : {}) as any
      };

      setMessages((prev) => [...prev, newMessage]);

      const insertData: any = {
           id: newMessage.id,
           sender_id: user.id,
           receiver_id: currentOtherUserProfile.id,
           content: caption,
           image_url: !isVideo ? publicUrl : null,
           audio_url: null,
           media_url: publicUrl,
           media_type: mediaType,
           status: 'sent',
           is_view_once: false,
      };

      if ((currentOtherUserProfile as any).isGroup) {
          insertData.room_id = currentOtherUserProfile.id;
          insertData.receiver_id = null;
      }

      await supabase.from('messages').insert(insertData);

      channelRef.current?.send({
         type: 'broadcast',
         event: 'new_message',
         payload: { messageId: newMessage.id, senderId: user.id, receiverId: (currentOtherUserProfile as any).isGroup ? null : currentOtherUserProfile.id, roomId: (currentOtherUserProfile as any).isGroup ? currentOtherUserProfile.id : undefined }
      });

      setSelectedMediaFile(null);
      setUploadProgress(0);

    } catch (error) {
      console.error(`Error uploading media:`, error);
      toast.error("Failed to upload media.");
      setUploadProgress(0);
    }
  };

  const uploadMediaFile = async (file: File | Blob, type: 'image' | 'audio', originalName?: string) => {"""
content = content.replace("  const uploadMediaFile = async (file: File | Blob, type: 'image' | 'audio', originalName?: string) => {", media_send_logic)

# Patch 6: Message Rendering
render_old = """                    {message.imageUrl && (
                      <div
                        className={`mb-1.5 relative overflow-hidden rounded-xl border border-white/10 ${message.isViewOnce && !message.viewedBy?.includes(user?.id || '') ? 'cursor-pointer' : (message.isViewOnce && message.viewedBy?.includes(user?.id || '') ? 'cursor-default' : 'cursor-zoom-in group')} bg-white/5 backdrop-blur-2xl`}"""
render_new = """                    {message.mediaType === 'video' || (message as any).videoUrl ? (
                      <div className="mb-1.5 relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-2xl">
                         <video
                            src={(message as any).videoUrl || message.imageUrl || message.audioUrl}
                            controls
                            className="max-w-[250px] w-full rounded-xl object-cover"
                         />
                      </div>
                    ) : message.imageUrl && (
                      <div
                        className={`mb-1.5 relative overflow-hidden rounded-xl border border-white/10 ${message.isViewOnce && !message.viewedBy?.includes(user?.id || '') ? 'cursor-pointer' : (message.isViewOnce && message.viewedBy?.includes(user?.id || '') ? 'cursor-default' : 'cursor-zoom-in group')} bg-white/5 backdrop-blur-2xl`}"""
content = content.replace(render_old, render_new)

# Payload update
payload_old = """             const newMessage: Message = {
               id: data.id,
               text,
               sender: 'other',
               timestamp: new Date(data.created_at),
               reactions: [],
               status: 'delivered',
               imageUrl: data.image_url,
               audioUrl: data.audio_url,
               replyToId,
               replyToSender,
               replyToText
             };"""
payload_new = """             const newMessage: Message = {
               id: data.id,
               text,
               sender: 'other',
               timestamp: new Date(data.created_at),
               reactions: [],
               status: 'delivered',
               imageUrl: data.image_url,
               audioUrl: data.audio_url,
               replyToId,
               replyToSender,
               replyToText,
               mediaType: data.media_type,
               ...(data.media_type === 'video' ? { videoUrl: data.media_url || data.image_url } : {}) as any
             };"""
content = content.replace(payload_old, payload_new)

# Add MediaPreview to render
preview_render_old = """      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectUser={setOtherUserProfile}
        onProfileUpdated={fetchCurrentUserProfile}
      />"""
preview_render_new = """      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectUser={setOtherUserProfile}
        onProfileUpdated={fetchCurrentUserProfile}
      />

      {selectedMediaFile && (
        <MediaPreview
          file={selectedMediaFile}
          onClose={() => { setSelectedMediaFile(null); setUploadProgress(0); }}
          onSend={handleSendMedia}
          isUploading={uploadProgress > 0}
          uploadProgress={uploadProgress}
        />
      )}"""
content = content.replace(preview_render_old, preview_render_new)


with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
