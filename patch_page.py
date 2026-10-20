import re

with open('components/profile/MyProfileView.tsx', 'r') as f:
    content = f.read()

# Modify handlePhotoUpload to ONLY upload to storage and update local state, not DB
old_handle_photo = """          const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);

          const updatedImages = [...displayPhotos];
          updatedImages[selectedSlotIndex] = publicUrl;

          // Clean up array for DB (remove empty strings)
          const dbImages = updatedImages.filter(url => url !== '');

          const { error: updateError } = await supabase
              .from('profiles')
              .update({ profile_images: dbImages })
              .eq('id', user.id);

          if (updateError) throw updateError;

          // The page might need a refresh to get the latest profile object, or we could update local state
          mappedProfile.publicImages = dbImages;
          displayPhotos[selectedSlotIndex] = publicUrl;

          toast.success("Photo updated successfully!");"""

new_handle_photo = """          const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);

          const updatedImages = [...displayPhotos];
          updatedImages[selectedSlotIndex] = publicUrl;

          // Clean up array for DB (remove empty strings)
          const dbImages = updatedImages.filter(url => url !== '');

          setLocalImages(dbImages);

          toast.success("Photo uploaded to slot! Remember to Save Profile.");"""

content = content.replace(old_handle_photo, new_handle_photo)

# Update handleSaveProfile to include profile_images: localImages
old_save_profile = """  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editForm)
        .eq('id', user.id);"""

new_save_profile = """  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
           ...editForm,
           profile_images: localImages
        })
        .eq('id', user.id);"""

content = content.replace(old_save_profile, new_save_profile)

with open('components/profile/MyProfileView.tsx', 'w') as f:
    f.write(content)
