with open('components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

if "import { MediaPreview }" not in content:
    content = content.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\nimport { MediaPreview } from './MediaPreview';")

# Replace handleFileUpload and states
state_addition = """
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState<string>('');

"""
if "const [mediaPreviewUrl" not in content:
    content = content.replace("  const [activeContextMenuId, setActiveContextMenuId] = useState<string | null>(null);", "  const [activeContextMenuId, setActiveContextMenuId] = useState<string | null>(null);" + state_addition)

file_upload_old = """
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadMediaFile(file, 'image', file.name);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
"""

file_upload_new = """
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        if (event.target?.result) {
            setMediaPreviewUrl(event.target.result as string);
            setMediaFile(file);
            setMediaCaption('');
        }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMediaSend = async () => {
     if (!mediaFile) return;
     setIsUploading(true);
     await uploadMediaFile(mediaFile, 'image', mediaCaption);
     setIsUploading(false);
     cancelMediaPreview();
  };

  const cancelMediaPreview = () => {
     setMediaPreviewUrl(null);
     setMediaFile(null);
     setMediaCaption('');
  };
"""
content = content.replace(file_upload_old.strip(), file_upload_new.strip())

# Add AnimatePresence for MediaPreview just before <AnimatePresence> for the chat input form or modal
media_preview_render = """
      <AnimatePresence>
        {mediaPreviewUrl && (
          <MediaPreview
            previewUrl={mediaPreviewUrl}
            caption={mediaCaption}
            setCaption={setMediaCaption}
            isUploading={isUploading}
            cancelPreview={cancelMediaPreview}
            handleSend={handleMediaSend}
          />
        )}
      </AnimatePresence>
"""

# inject before main layout wrapper (return <div className="flex flex-col h-full bg-black relative">)
if "<MediaPreview" not in content:
    content = content.replace('  return (\n    <div className="flex flex-col h-full bg-black relative">', '  return (\n    <div className="flex flex-col h-full bg-black relative">\n' + media_preview_render)

with open('components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)
