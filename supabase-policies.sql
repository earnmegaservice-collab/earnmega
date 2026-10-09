-- Enable RLS on the storage.objects table if it is not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload (insert) files into the "chat-media" bucket
CREATE POLICY "Allow authenticated uploads to chat-media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- Allow anyone to read (select) files from the "chat-media" bucket
CREATE POLICY "Allow public read access on chat-media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-media');

-- Allow authenticated users to update their own files in the "chat-media" bucket (optional, but good practice)
CREATE POLICY "Allow authenticated users to update their files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-media' AND auth.uid() = owner);

-- Allow authenticated users to delete their own files in the "chat-media" bucket (optional, but good practice)
CREATE POLICY "Allow authenticated users to delete their files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media' AND auth.uid() = owner);
