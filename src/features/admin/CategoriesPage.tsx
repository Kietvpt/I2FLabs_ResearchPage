import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderTree, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteCategory,
  fetchCategoriesAdmin,
  upsertCategory,
  type CategoryWithCount,
} from '@/features/admin/api';
import { slugify } from '@/lib/utils';

const COLOR_SWATCHES = [
  '#202124',
  '#3c4043',
  '#5f6368',
  '#70757a',
  '#9aa0a6',
  '#dadce0',
  '#e8eaed',
  '#ffffff',
];

export function CategoriesPage() {
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [sortOrder, setSortOrder] = useState(0);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchCategoriesAdmin,
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setSlugTouched(false);
    setDescription('');
    setColor(COLOR_SWATCHES[0]);
    setSortOrder(categories.length + 1);
  };

  const startEdit = (cat: CategoryWithCount) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setSlugTouched(true);
    setDescription(cat.description || '');
    setColor(cat.color || COLOR_SWATCHES[0]);
    setSortOrder(cat.sort_order ?? 0);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('Vui lòng nhập tên danh mục.');
      return upsertCategory(
        {
          name: name.trim(),
          slug: slugify(slug || name),
          description: description.trim() || null,
          color,
          sort_order: Number(sortOrder) || 0,
        },
        editingId ?? undefined
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(editingId ? 'Đã cập nhật danh mục' : 'Đã tạo danh mục mới');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Đã xóa danh mục');
      if (editingId) resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
          Quản lý Danh mục Nghiên cứu
        </h1>
        <p className="text-sm text-muted mt-1">
          Phân loại các bài báo cáo theo lĩnh vực nghiên cứu và màu sắc nhận diện.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-surface border border-border rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {editingId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" /> Hủy
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Tên danh mục</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="VD: AI & Cognitive Systems"
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="ai-cognitive-systems"
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Mô tả ngắn</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả phạm vi nghiên cứu của danh mục này..."
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Màu nhận diện
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      color === swatch
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch }}
                    title={swatch}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Thứ tự hiển thị
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm font-mono text-foreground"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-60 transition-opacity shadow-xs"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {editingId ? 'Lưu thay đổi' : 'Tạo danh mục'}
          </button>
        </form>

        {/* List */}
        <div className="lg:col-span-7 bg-surface border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            </div>
          ) : categories.length === 0 ? (
            <div className="p-10 text-center">
              <FolderTree className="w-7 h-7 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted">Chưa có danh mục nào.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="p-4 flex items-start justify-between gap-4 hover:bg-subtle/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-sm text-foreground">{cat.name}</span>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-subtle text-muted">
                        {cat.report_count} bài
                      </span>
                    </div>
                    <p className="text-xs font-mono text-muted mt-0.5">/{cat.slug}</p>
                    {cat.description && (
                      <p className="text-xs text-muted mt-1.5 line-clamp-2">{cat.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Xóa danh mục "${cat.name}"? Các bài báo cáo thuộc danh mục này sẽ chuyển về chưa phân loại.`
                          )
                        ) {
                          deleteMutation.mutate(cat.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
