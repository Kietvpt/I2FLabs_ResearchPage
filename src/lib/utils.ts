import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Gộp Tailwind class an toàn (tránh xung đột utility class).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Tạo URL slug chuẩn SEO, hỗ trợ đầy đủ tiếng Việt có dấu.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Ước lượng thời gian đọc (phút) cho bài Markdown học thuật/kỹ thuật (~220 từ/phút).
 */
export function estimateReadingTime(markdown: string): number {
  if (!markdown || !markdown.trim()) return 1;
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, ' code ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\-|]/g, ' ')
    .trim();

  const words = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

/**
 * Định dạng ngày hiển thị gọn cho bài nghiên cứu (mặc định tiếng Việt).
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  locale = 'vi-VN'
): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
