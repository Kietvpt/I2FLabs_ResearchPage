import imageCompression from 'browser-image-compression';
import { REPORT_ASSETS_BUCKET, formatSupabaseError, supabase } from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import type { MediaAsset } from '@/types/database';

export interface UploadedImageResult {
  publicUrl: string;
  mediaAsset: MediaAsset | null;
  storagePath: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB raw input limit before compression

async function getImageDimensions(
  file: Blob
): Promise<{ width: number | null; height: number | null }> {
  if (typeof window === 'undefined') return { width: null, height: null };
  try {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(file);
      const result = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return result;
    }
  } catch {
    // Fallback below
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth || null, height: img.naturalHeight || null });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };
    img.src = url;
  });
}

/**
 * Nén ảnh trên trình duyệt (WebP, max 1920px, <= 1MB), upload lên Supabase Storage
 * bucket `report-assets`, đồng thời lưu metadata vào bảng `media`.
 */
export async function uploadReportImage(
  file: File,
  options?: {
    reportId?: string | null;
    altText?: string;
  }
): Promise<UploadedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Chỉ hỗ trợ tệp hình ảnh (PNG, JPG, WebP, GIF, SVG).');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Ảnh quá lớn (tối đa 10MB trước khi nén).');
  }

  const isBypassCompression =
    file.type === 'image/svg+xml' || file.type === 'image/gif';

  let uploadBlob: Blob = file;
  let mimeType = file.type;
  let extension = file.name.split('.').pop()?.toLowerCase() || 'webp';

  if (!isBypassCompression) {
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.85,
      });
      uploadBlob = compressed;
      mimeType = compressed.type || 'image/webp';
      extension = mimeType === 'image/webp' ? 'webp' : extension;
    } catch {
      // Nếu trình duyệt không hỗ trợ webp encoder, giữ nguyên file gốc
      uploadBlob = file;
      mimeType = file.type;
    }
  }

  const dimensions =
    mimeType === 'image/svg+xml'
      ? { width: null, height: null }
      : await getImageDimensions(uploadBlob);

  const baseName = slugify(file.name.replace(/\.[^/.]+$/, '')) || 'image';
  const folder = options?.reportId ? `reports/${options.reportId}` : 'library';
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${folder}/${uniqueSuffix}-${baseName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(REPORT_ASSETS_BUCKET)
    .upload(storagePath, uploadBlob, {
      contentType: mimeType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload ảnh thất bại: ${formatSupabaseError(uploadError)}`);
  }

  const { data: urlData } = supabase.storage
    .from(REPORT_ASSETS_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: mediaRow, error: mediaError } = await supabase
    .from('media')
    .insert({
      report_id: options?.reportId ?? null,
      storage_path: storagePath,
      public_url: publicUrl,
      alt_text: options?.altText || file.name.replace(/\.[^/.]+$/, ''),
      mime_type: mimeType,
      size_bytes: uploadBlob.size,
      width: dimensions.width,
      height: dimensions.height,
      uploaded_by: user?.id ?? null,
    })
    .select('*')
    .single();

  if (mediaError) {
    // Ảnh đã lên Storage nhưng ghi bảng media lỗi: vẫn trả publicUrl để không gián đoạn editor
    console.warn('[Media] Upload thành công nhưng ghi bảng media thất bại:', mediaError.message);
    return {
      publicUrl,
      mediaAsset: null,
      storagePath,
    };
  }

  return {
    publicUrl,
    mediaAsset: mediaRow as MediaAsset,
    storagePath,
  };
}
