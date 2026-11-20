import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  ArrowLeft,
  Bold,
  Code2,
  Columns2,
  Eye,
  FileUp,
  GitBranch,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Loader2,
  PenLine,
  Plus,
  Save,
  Send,
  Sigma,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { useTheme } from '@/context/ThemeContext';
import {
  fetchCategoriesAdmin,
  fetchReportByIdAdmin,
  upsertReport,
} from '@/features/admin/api';
import { parseResearchMarkdown, type ParsedResearchMarkdown } from '@/lib/frontmatter';
import { uploadReportImage } from '@/lib/imageUpload';
import { cn, estimateReadingTime, slugify } from '@/lib/utils';
import type {
  AiContributor,
  CollaborationMode,
  HumanAuthor,
  ReportInput,
  ReportStatus,
  ReportType,
  SourceMetadata,
} from '@/types/database';

type ViewMode = 'write' | 'split' | 'preview';

const REPORT_TYPES: Array<{ value: ReportType; label: string }> = [
  { value: 'whitepaper', label: 'Whitepaper (Master)' },
  { value: 'research', label: 'Research Paper' },
  { value: 'benchmark', label: 'Benchmark / Telemetry' },
  { value: 'empirical_poc', label: 'Empirical PoC' },
  { value: 'specification', label: 'Specification / RFC' },
  { value: 'hypothesis', label: 'Hypothesis' },
  { value: 'debate', label: 'Dialectic Debate' },
  { value: 'trade_off', label: 'Trade-off Matrix' },
  { value: 'failure_mode', label: 'Failure Mode (FMEA)' },
  { value: 'question', label: 'Foundational Question' },
];

const COLLAB_MODES: Array<{ value: CollaborationMode; label: string }> = [
  { value: 'co_authored', label: 'Co-Authored (Human + AI)' },
  { value: 'human_led', label: 'Human-Led' },
  { value: 'ai_assisted', label: 'AI-Assisted' },
];

export function ReportEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  const editorRef = useRef<ReactCodeMirrorRef | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const mdImportInputRef = useRef<HTMLInputElement | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [metaOpen, setMetaOpen] = useState(true);
  const [slugTouched, setSlugTouched] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [contentMd, setContentMd] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [reportType, setReportType] = useState<ReportType>('research');
  const [status, setStatus] = useState<ReportStatus>('draft');
  const [isFeatured, setIsFeatured] = useState(false);
  const [version, setVersion] = useState('1.0.0');
  const [collaborationMode, setCollaborationMode] = useState<CollaborationMode>('co_authored');
  const [tagsText, setTagsText] = useState('');
  const [modelsText, setModelsText] = useState('');
  const [humanAuthors, setHumanAuthors] = useState<HumanAuthor[]>([
    { name: 'I2FLabs Research Team', role: 'Lead Researcher' },
  ]);
  const [aiContributors, setAiContributors] = useState<AiContributor[]>([]);
  const [sourceMetadata, setSourceMetadata] = useState<SourceMetadata>({});
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchCategoriesAdmin,
  });

  const { data: existingReport, isLoading: loadingReport } = useQuery({
    queryKey: ['admin-report', id],
    queryFn: () => fetchReportByIdAdmin(id!),
    enabled: isEditing,
  });

  const applyParsedMarkdown = useCallback(
    (parsed: ParsedResearchMarkdown) => {
      const r = parsed.report;
      if (r.title) setTitle(r.title);
      if (r.slug) {
        setSlug(r.slug);
        setSlugTouched(true);
      }
      if (r.summary !== undefined) setSummary(r.summary || '');
      if (r.content_md !== undefined) setContentMd(r.content_md);
      if (r.cover_image_url) setCoverImageUrl(r.cover_image_url);
      if (r.report_type) setReportType(r.report_type);
      if (r.status) setStatus(r.status);
      if (r.is_featured !== undefined) setIsFeatured(r.is_featured);
      if (r.version) setVersion(r.version);
      if (r.collaboration_mode) setCollaborationMode(r.collaboration_mode);
      if (r.tag_names) setTagsText(r.tag_names.join(', '));
      if (r.model_used) setModelsText(r.model_used.join(', '));
      if (r.human_authors?.length) setHumanAuthors(r.human_authors);
      if (r.ai_contributors) setAiContributors(r.ai_contributors);
      if (r.source_metadata) setSourceMetadata(r.source_metadata);
      if (r.published_at) setPublishedAt(r.published_at);

      if (parsed.suggestedCategorySlug && categories.length > 0) {
        const matched = categories.find((c) => c.slug === parsed.suggestedCategorySlug);
        if (matched) setCategoryId(matched.id);
      }
    },
    [categories]
  );

  // Hydrate when editing existing report
  useEffect(() => {
    if (!existingReport) return;
    setTitle(existingReport.title);
    setSlug(existingReport.slug);
    setSlugTouched(true);
    setSummary(existingReport.summary || '');
    setContentMd(existingReport.content_md || '');
    setCoverImageUrl(existingReport.cover_image_url || '');
    setCategoryId(existingReport.category_id || '');
    setReportType(existingReport.report_type);
    setStatus(existingReport.status);
    setIsFeatured(existingReport.is_featured);
    setVersion(existingReport.version || '1.0.0');
    setCollaborationMode(existingReport.collaboration_mode || 'co_authored');
    setTagsText((existingReport.tags || []).map((t) => t.name).join(', '));
    setModelsText((existingReport.model_used || []).join(', '));
    setHumanAuthors(
      existingReport.human_authors?.length
        ? existingReport.human_authors
        : [{ name: 'I2FLabs Research Team', role: 'Lead Researcher' }]
    );
    setAiContributors(existingReport.ai_contributors || []);
    setSourceMetadata(existingReport.source_metadata || {});
    setPublishedAt(existingReport.published_at);
  }, [existingReport]);

  // Hydrate when navigated from Dashboard Import .md
  const appliedImportRef = useRef(false);
  useEffect(() => {
    if (isEditing || appliedImportRef.current) return;
    const imported = (location.state as { importedReport?: ParsedResearchMarkdown } | null)
      ?.importedReport;
    if (imported) {
      appliedImportRef.current = true;
      applyParsedMarkdown(imported);
    }
  }, [isEditing, location.state, applyParsedMarkdown]);

  // Match suggested category once categories load after import
  useEffect(() => {
    if (isEditing || categoryId || categories.length === 0) return;
    const imported = (location.state as { importedReport?: ParsedResearchMarkdown } | null)
      ?.importedReport;
    if (imported?.suggestedCategorySlug) {
      const matched = categories.find((c) => c.slug === imported.suggestedCategorySlug);
      if (matched) setCategoryId(matched.id);
    }
  }, [isEditing, categoryId, categories, location.state]);

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle);
    if (!slugTouched) {
      setSlug(slugify(nextTitle));
    }
  };

  const insertAtCursor = useCallback((snippet: string, replaceFrom?: string) => {
    const view = editorRef.current?.view;
    if (replaceFrom) {
      setContentMd((prev) => prev.replace(replaceFrom, snippet));
      return;
    }
    if (view) {
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + snippet.length },
      });
      view.focus();
    } else {
      setContentMd((prev) => `${prev}${prev && !prev.endsWith('\n') ? '\n' : ''}${snippet}`);
    }
  }, []);

  const handleInlineImageUpload = useCallback(
    async (file: File) => {
      const placeholder = `![Uploading ${file.name}...]()`;
      insertAtCursor(`\n${placeholder}\n`);
      setUploadingImage(true);

      try {
        const result = await uploadReportImage(file, { reportId: id ?? null });
        const alt = file.name.replace(/\.[^/.]+$/, '');
        insertAtCursor(`![${alt}](${result.publicUrl})`, placeholder);
        toast.success('Đã tải ảnh lên và chèn vào bài viết');
      } catch (err) {
        insertAtCursor('', placeholder);
        toast.error(err instanceof Error ? err.message : 'Upload ảnh thất bại');
      } finally {
        setUploadingImage(false);
      }
    },
    [id, insertAtCursor]
  );

  const handleEditorDrop = async (e: DragEvent<HTMLDivElement>) => {
    const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    for (const file of files) {
      await handleInlineImageUpload(file);
    }
  };

  const handleEditorPaste = async (e: ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;

    e.preventDefault();
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (file) {
        await handleInlineImageUpload(file);
      }
    }
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadReportImage(file, { reportId: id ?? null, altText: `${title} cover` });
      setCoverImageUrl(res.publicUrl);
      toast.success('Đã cập nhật ảnh bìa');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload ảnh bìa thất bại');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImportMdInEditor = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseResearchMarkdown(text, file.name, { defaultStatus: status });
      applyParsedMarkdown(parsed);
      toast.success(`Đã nạp nội dung từ "${file.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể đọc file .md');
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (overrideStatus?: ReportStatus) => {
      if (!title.trim()) {
        throw new Error('Vui lòng nhập tiêu đề bài báo cáo.');
      }
      const nextStatus = overrideStatus ?? status;
      const input: ReportInput = {
        title: title.trim(),
        slug: slugify(slug || title),
        summary: summary.trim() || null,
        content_md: contentMd,
        cover_image_url: coverImageUrl.trim() || null,
        category_id: categoryId || null,
        report_type: reportType,
        status: nextStatus,
        is_featured: isFeatured,
        version: version.trim() || '1.0.0',
        reading_time: estimateReadingTime(contentMd),
        human_authors: humanAuthors.filter((a) => a.name.trim()),
        ai_contributors: aiContributors.filter((a) => a.agent_name.trim()),
        model_used: modelsText
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean),
        collaboration_mode: collaborationMode,
        source_metadata: sourceMetadata,
        published_at: publishedAt,
        tag_names: tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      return upsertReport(input, id);
    },
    onSuccess: (saved) => {
      setStatus(saved.status);
      setPublishedAt(saved.published_at);
      void queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-report', saved.id] });
      void queryClient.invalidateQueries({ queryKey: ['published-reports'] });
      toast.success(
        saved.status === 'published' ? 'Đã xuất bản báo cáo thành công!' : 'Đã lưu bản nháp!'
      );
      if (!isEditing) {
        navigate(`/admin/reports/${saved.id}/edit`, { replace: true });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isEditing && loadingReport) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <p className="text-sm text-muted">Đang tải nội dung báo cáo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden">
      {/* Top Sticky Action Bar */}
      <header className="h-14 px-3 sm:px-4 border-b border-border bg-surface flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link
            to="/admin"
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-subtle shrink-0"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Nhập tiêu đề bài báo cáo nghiên cứu..."
            className="w-full min-w-0 bg-transparent text-sm sm:text-base font-serif font-semibold text-foreground placeholder:text-muted/60 focus:outline-none truncate"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* View mode toggle */}
          <div className="hidden sm:flex items-center rounded-lg border border-border bg-canvas p-0.5">
            {(
              [
                { mode: 'write', icon: PenLine, label: 'Write' },
                { mode: 'split', icon: Columns2, label: 'Split' },
                { mode: 'preview', icon: Eye, label: 'Preview' },
              ] as const
            ).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
                  viewMode === mode
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>

          <input
            ref={mdImportInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            onChange={handleImportMdInEditor}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => mdImportInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-subtle"
            title="Import file .md"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Import .md</span>
          </button>

          <button
            type="button"
            onClick={() => setMetaOpen((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
              metaOpen
                ? 'border-accent/40 bg-accent-soft text-accent'
                : 'border-border text-muted hover:text-foreground hover:bg-subtle'
            )}
            title="Mở/Đóng bảng Metadata"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Metadata</span>
          </button>

          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate('draft')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs font-medium text-foreground hover:bg-subtle disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save Draft</span>
          </button>

          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate('published')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-95 disabled:opacity-60"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Publish</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Editor + Preview Area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Formatting Toolbar */}
          {viewMode !== 'preview' && (
            <div className="h-10 px-3 border-b border-border bg-subtle/50 flex items-center gap-1 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => insertAtCursor('**in đậm**')}
                className="p-1.5 rounded hover:bg-surface text-muted hover:text-foreground"
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertAtCursor('*in nghiêng*')}
                className="p-1.5 rounded hover:bg-surface text-muted hover:text-foreground"
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertAtCursor('\n## Tiêu đề mục\n')}
                className="p-1.5 rounded hover:bg-surface text-muted hover:text-foreground"
                title="Heading 2"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertAtCursor('\n### Tiểu mục\n')}
                className="p-1.5 rounded hover:bg-surface text-muted hover:text-foreground"
                title="Heading 3"
              >
                <Heading3 className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                type="button"
                onClick={() => insertAtCursor('\n```ts\n// Code here\n```\n')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted hover:bg-surface hover:text-foreground"
                title="Code Block"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Code</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  insertAtCursor(
                    '\n```mermaid\ngraph LR\n    A["Input"] --> B["AI Analysis"]\n    B --> C["Verified Output"]\n```\n'
                  )
                }
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted hover:bg-surface hover:text-foreground"
                title="Chèn biểu đồ Mermaid"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Mermaid</span>
              </button>
              <button
                type="button"
                onClick={() => insertAtCursor('\n$$\nFCI = \\frac{T_{deep}}{T_{total}}\n$$\n')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted hover:bg-surface hover:text-foreground"
                title="Chèn công thức KaTeX"
              >
                <Sigma className="w-3.5 h-3.5" />
                <span>KaTeX</span>
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void handleInlineImageUpload(f);
                }}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-accent hover:bg-accent-soft disabled:opacity-60"
                title="Upload ảnh (hoặc kéo-thả / Ctrl+V trực tiếp vào khung soạn thảo)"
              >
                {uploadingImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="w-3.5 h-3.5" />
                )}
                <span>Upload Image</span>
              </button>
              <span className="ml-auto text-[11px] font-mono text-muted hidden lg:inline">
                ~{estimateReadingTime(contentMd)} min read · Hỗ trợ kéo-thả / Ctrl+V ảnh
              </span>
            </div>
          )}

          {/* Split Panes */}
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* CodeMirror Pane */}
            {viewMode !== 'preview' && (
              <div
                onDrop={handleEditorDrop}
                onDragOver={(e) => {
                  if (Array.from(e.dataTransfer.types).includes('Files')) {
                    e.preventDefault();
                  }
                }}
                onPaste={handleEditorPaste}
                className={cn(
                  'h-full overflow-y-auto bg-canvas',
                  viewMode === 'split' ? 'w-1/2 border-r border-border' : 'w-full'
                )}
              >
                <CodeMirror
                  ref={editorRef}
                  value={contentMd}
                  onChange={(val) => setContentMd(val)}
                  extensions={[markdown()]}
                  theme={theme === 'dark' ? oneDark : 'light'}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                  }}
                  placeholder="# Viết nội dung báo cáo Markdown tại đây...&#10;&#10;Hỗ trợ GFM Tables, biểu đồ ```mermaid```, công thức $$KaTeX$$, và kéo-thả / Ctrl+V ảnh trực tiếp."
                  className="text-sm font-mono h-full"
                />
              </div>
            )}

            {/* Live Preview Pane */}
            {viewMode !== 'write' && (
              <div
                className={cn(
                  'h-full overflow-y-auto bg-canvas px-6 py-6',
                  viewMode === 'split' ? 'w-1/2' : 'w-full max-w-4xl mx-auto'
                )}
              >
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-4 pb-2 border-b border-border">
                  Live Preview (Markdown · Mermaid · KaTeX)
                </div>
                {contentMd.trim() ? (
                  <MarkdownRenderer content={contentMd} />
                ) : (
                  <p className="text-sm text-muted italic">
                    Nội dung xem trước sẽ hiển thị tại đây khi bạn bắt đầu soạn thảo...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Metadata Panel */}
        {metaOpen && (
          <aside className="w-80 lg:w-88 border-l border-border bg-surface h-full overflow-y-auto p-4 space-y-5 shrink-0">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-semibold">
              Report Metadata
            </h2>

            {/* Slug */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="ten-bai-bao-cao"
                className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Tóm tắt (Abstract / Summary)
              </label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Mô tả ngắn gọn mục tiêu và phát hiện cốt lõi..."
                className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            {/* Category & Report Type */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Danh mục</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">— Chưa chọn danh mục —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Loại tài liệu (Report Type)
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {REPORT_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>
                      {rt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Tags (ngăn cách bằng dấu phẩy)
              </label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="flow_state, benchmark, human_ai"
                className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            {/* Cover Image */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-foreground">Ảnh bìa (Cover Image)</label>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </button>
              </div>
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className="mt-2 w-full h-28 object-cover rounded-lg border border-border"
                />
              )}
            </div>

            {/* Human-AI Collaboration */}
            <div className="pt-3 border-t border-border space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-ai font-semibold">
                Human–AI Collaboration
              </h3>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Chế độ cộng tác
                </label>
                <select
                  value={collaborationMode}
                  onChange={(e) => setCollaborationMode(e.target.value as CollaborationMode)}
                  className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground"
                >
                  {COLLAB_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Human Authors */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-foreground">Human Authors</label>
                  <button
                    type="button"
                    onClick={() =>
                      setHumanAuthors((prev) => [...prev, { name: '', role: 'Researcher' }])
                    }
                    className="inline-flex items-center gap-0.5 text-[11px] text-accent hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Thêm
                  </button>
                </div>
                <div className="space-y-1.5">
                  {humanAuthors.map((author, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={author.name}
                        onChange={(e) =>
                          setHumanAuthors((prev) =>
                            prev.map((a, i) => (i === idx ? { ...a, name: e.target.value } : a))
                          )
                        }
                        placeholder="Tên tác giả"
                        className="flex-1 min-w-0 rounded border border-border bg-canvas px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={author.role || ''}
                        onChange={(e) =>
                          setHumanAuthors((prev) =>
                            prev.map((a, i) => (i === idx ? { ...a, role: e.target.value } : a))
                          )
                        }
                        placeholder="Vai trò"
                        className="w-24 rounded border border-border bg-canvas px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setHumanAuthors((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-muted hover:text-red-500"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Contributors */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-foreground">AI Contributors</label>
                  <button
                    type="button"
                    onClick={() =>
                      setAiContributors((prev) => [
                        ...prev,
                        { agent_name: '', role: 'AI Co-Author' },
                      ])
                    }
                    className="inline-flex items-center gap-0.5 text-[11px] text-ai hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Thêm Agent
                  </button>
                </div>
                <div className="space-y-1.5">
                  {aiContributors.map((ai, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={ai.agent_name}
                        onChange={(e) =>
                          setAiContributors((prev) =>
                            prev.map((a, i) =>
                              i === idx ? { ...a, agent_name: e.target.value } : a
                            )
                          )
                        }
                        placeholder="Agent (VD: An, Vidus)"
                        className="flex-1 min-w-0 rounded border border-border bg-canvas px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={ai.role || ''}
                        onChange={(e) =>
                          setAiContributors((prev) =>
                            prev.map((a, i) => (i === idx ? { ...a, role: e.target.value } : a))
                          )
                        }
                        placeholder="Vai trò"
                        className="w-24 rounded border border-border bg-canvas px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setAiContributors((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-muted hover:text-red-500"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Models Used */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Models Used (ngăn cách dấu phẩy)
                </label>
                <input
                  type="text"
                  value={modelsText}
                  onChange={(e) => setModelsText(e.target.value)}
                  placeholder="Gemini 2.5 Pro, Claude 3.7 Sonnet"
                  className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground"
                />
              </div>
            </div>

            {/* Version & Featured */}
            <div className="pt-3 border-t border-border grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Version</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-foreground mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                Featured Report
              </label>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
