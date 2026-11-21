import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Code2,
  Copy,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { deleteMediaAsset, fetchMediaAssets } from '@/features/admin/api';
import { uploadReportImage } from '@/lib/imageUpload';
import { formatDate } from '@/lib/utils';
import type { MediaAsset } from '@/types/database';

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function MediaLibraryPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['admin-media'],
    queryFn: fetchMediaAssets,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMediaAsset,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-media'] });
      toast.success('Đã xóa ảnh khỏi thư viện');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUploadFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      try {
        await uploadReportImage(file);
        successCount += 1;
      } catch (err) {
        toast.error(
          `${file.name}: ${err instanceof Error ? err.message : 'Upload thất bại'}`
        );
      }
    }

    setUploading(false);
    if (successCount > 0) {
      void queryClient.invalidateQueries({ queryKey: ['admin-media'] });
      toast.success(`Đã tải lên ${successCount} hình ảnh (đã tự tối ưu WebP)`);
    }
  };

  const handleCopy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      toast.success(`Đã copy ${label}`);
      setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      toast.error('Không thể copy vào clipboard');
    }
  };

  const handleDelete = (asset: MediaAsset) => {
    if (!window.confirm('Xóa ảnh này khỏi Supabase Storage và thư viện?')) return;
    deleteMutation.mutate(asset);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
            Media Library
          </h1>
          <p className="text-sm text-muted mt-1">
            Quản lý toàn bộ hình ảnh minh họa, biểu đồ và ảnh bìa trong bucket{' '}
            <code className="font-mono text-xs">report-assets</code>.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUploadFiles}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-60 transition-opacity shadow-xs"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Đang nén & tải lên...' : 'Upload ảnh mới'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-surface border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <p className="text-sm text-muted">Đang tải thư viện ảnh...</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <ImageIcon className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-base font-medium text-foreground">Chưa có hình ảnh nào</p>
          <p className="text-sm text-muted mt-1 mb-5">
            Tải ảnh lên tại đây hoặc kéo-thả trực tiếp trong trình soạn thảo bài báo cáo.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-canvas hover:opacity-90 transition-opacity shadow-xs"
          >
            <Upload className="w-4 h-4" />
            Upload ảnh đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {assets.map((asset) => {
            const mdSnippet = `![${asset.alt_text || 'image'}](${asset.public_url})`;
            return (
              <div
                key={asset.id}
                className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col group"
              >
                <div className="aspect-video bg-subtle relative overflow-hidden">
                  <img
                    src={asset.public_url}
                    alt={asset.alt_text || 'Uploaded asset'}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                  <div>
                    <p className="text-xs font-medium text-foreground truncate" title={asset.alt_text || ''}>
                      {asset.alt_text || asset.storage_path.split('/').pop()}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-muted">
                      <span>{formatBytes(asset.size_bytes)}</span>
                      {asset.width && asset.height && (
                        <span>
                          · {asset.width}×{asset.height}
                        </span>
                      )}
                      <span className="ml-auto">{formatDate(asset.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => handleCopy(mdSnippet, `${asset.id}-md`, 'Markdown')}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border bg-canvas px-2 py-1 text-[11px] font-medium text-foreground hover:bg-subtle"
                      title="Copy cú pháp Markdown ![alt](url)"
                    >
                      {copiedId === `${asset.id}-md` ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Code2 className="w-3 h-3" />
                      )}
                      Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(asset.public_url, `${asset.id}-url`, 'URL')}
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-canvas px-2 py-1 text-[11px] font-medium text-foreground hover:bg-subtle"
                      title="Copy URL ảnh"
                    >
                      {copiedId === `${asset.id}-url` ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      URL
                    </button>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(asset)}
                      className="p-1.5 rounded-md text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10"
                      title="Xóa ảnh"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
