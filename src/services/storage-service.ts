import { supabase } from '@/src/lib/supabase';

type BucketName = 'event-assets' | 'profile-assets' | 'repository-assets' | 'winner-assets' | 'support-assets';

export const storageService = {
  async uploadImage(bucket: BucketName, folder: string, imageUri?: string | null) {
    if (!imageUri) {
      return null;
    }

    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error('Unable to read the selected image from your device.');
    }

    const arrayBuffer = await response.arrayBuffer();
    const extension = imageUri.split('.').pop()?.split('?')[0] || 'jpg';
    const filePath = `${folder}/${Date.now()}.${extension}`;
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    const { error } = await supabase.storage.from(bucket).upload(filePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  },

  async uploadDocument(bucket: BucketName, folder: string, documentUri?: string | null) {
    if (!documentUri) {
      return null;
    }

    const response = await fetch(documentUri);
    if (!response.ok) {
      throw new Error('Unable to read the selected document file from your device.');
    }

    const arrayBuffer = await response.arrayBuffer();
    const extension = documentUri.split('.').pop()?.split('?')[0] || 'pdf';
    const filePath = `${folder}/${Date.now()}.${extension}`;
    const contentType = response.headers.get('content-type') || 'application/pdf';

    const { error } = await supabase.storage.from(bucket).upload(filePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  },
};
