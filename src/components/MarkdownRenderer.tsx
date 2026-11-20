import {
  isValidElement,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import {
  Check,
  Copy,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return '';
}

function MermaidBlock({ code }: { code: string }) {
  const { theme } = useTheme();
  const uniqueId = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setLoading(true);
      setError(null);
      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: theme === 'dark' ? 'dark' : 'neutral',
          fontFamily: 'Inter, system-ui, sans-serif',
        });

        const renderId = `mermaid-${uniqueId}-${Date.now()}`;
        const result = await mermaid.render(renderId, code.trim());
        if (!cancelled) {
          setSvg(result.svg);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Không thể hiển thị biểu đồ Mermaid.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [code, theme, uniqueId]);

  useEffect(() => {
    if (!zoomOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Đã sao chép mã Mermaid');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Không thể sao chép vào clipboard');
    }
  };

  return (
    <>
      <div className="not-prose my-6 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-subtle/70 px-3.5 py-2 text-xs text-muted">
          <span className="font-mono font-medium uppercase tracking-wider text-foreground/80">
            Mermaid Diagram
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted transition hover:bg-surface hover:text-foreground"
              title="Sao chép mã Mermaid"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Đã chép' : 'Copy'}</span>
            </button>
            {svg && !error && (
              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setZoomOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted transition hover:bg-surface hover:text-foreground"
                title="Phóng to sơ đồ"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Zoom</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted">
              Đang kết xuất sơ đồ Mermaid...
            </div>
          ) : error ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Lỗi cú pháp Mermaid: {error}</span>
              </div>
              <pre className="overflow-x-auto rounded bg-subtle p-3 font-mono text-xs text-foreground">
                {code}
              </pre>
            </div>
          ) : (
            <div
              className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
      </div>

      {zoomOpen && svg && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
          onClick={() => setZoomOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Phóng to sơ đồ Mermaid"
        >
          <div
            className="flex items-center justify-between border-b border-white/10 bg-surface/95 px-4 py-3 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-mono text-xs font-medium uppercase tracking-wider text-muted">
              Mermaid Diagram Viewer
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.25).toFixed(2))))}
                className="rounded-md border border-border bg-subtle p-1.5 text-muted hover:text-foreground"
                title="Thu nhỏ"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[3.2rem] text-center font-mono text-xs tabular-nums text-muted">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.25).toFixed(2))))}
                className="rounded-md border border-border bg-subtle p-1.5 text-muted hover:text-foreground"
                title="Phóng to"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setScale(1)}
                className="rounded-md border border-border bg-subtle p-1.5 text-muted hover:text-foreground"
                title="Đặt lại 100%"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomOpen(false)}
                className="ml-2 rounded-md border border-border bg-subtle p-1.5 text-muted hover:text-foreground"
                title="Đóng (ESC)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className="flex flex-1 items-center justify-center overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-xl border border-border bg-surface p-8 shadow-2xl transition-transform duration-150"
              style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Đã sao chép đoạn mã');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Không thể sao chép vào clipboard');
    }
  };

  return (
    <div className="not-prose my-6 overflow-hidden rounded-lg border border-border bg-subtle/80">
      <div className="flex items-center justify-between border-b border-border bg-subtle px-3.5 py-2">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
          {language || 'text'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted transition hover:bg-surface hover:text-foreground"
          title="Sao chép mã"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Đã chép' : 'Copy'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function LightboxImage({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!src) return null;

  return (
    <>
      <span className="not-prose my-6 block">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative block w-full overflow-hidden rounded-lg border border-border bg-surface text-left transition hover:border-accent/50"
          title="Nhấn để phóng to hình ảnh"
        >
          <img
            src={src}
            alt={alt || ''}
            loading="lazy"
            className="mx-auto max-h-[540px] w-auto object-contain transition duration-200 group-hover:scale-[1.01]"
          />
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
            <Maximize2 className="h-3 w-3" />
            Phóng to
          </span>
        </button>
        {alt && (
          <span className="mt-2 block text-center text-xs text-muted">
            {alt}
          </span>
        )}
      </span>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt || 'Xem ảnh phóng to'}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            title="Đóng (ESC)"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="max-h-[90vh] max-w-[92vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt || ''}
              className="max-h-[84vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            {alt && (
              <p className="mt-3 text-center text-sm text-zinc-300">{alt}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const components: Components = {
    pre({ children }) {
      if (isValidElement<{ className?: string; children?: ReactNode }>(children)) {
        const childClassName = children.props.className || '';
        const match = /language-([\w-]+)/.exec(childClassName);
        const language = match?.[1]?.toLowerCase() || '';
        const rawCode = extractText(children.props.children).replace(/\n$/, '');

        if (language === 'mermaid') {
          return <MermaidBlock code={rawCode} />;
        }
        return <CodeBlock language={language} code={rawCode} />;
      }
      return <pre>{children}</pre>;
    },

    code({ className: codeClassName, children, ...props }) {
      return (
        <code
          className={cn(
            'rounded border border-border/60 bg-subtle px-1.5 py-0.5 font-mono text-[0.86em] text-foreground',
            codeClassName
          )}
          {...props}
        >
          {children}
        </code>
      );
    },

    table({ children }) {
      return (
        <div className="not-prose my-6 w-full overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
          <table className="w-full border-collapse text-left text-sm tabular-nums">
            {children}
          </table>
        </div>
      );
    },

    thead({ children }) {
      return (
        <thead className="border-b border-border bg-subtle/80 text-xs font-semibold uppercase tracking-wide text-muted">
          {children}
        </thead>
      );
    },

    tbody({ children }) {
      return <tbody className="divide-y divide-border">{children}</tbody>;
    },

    tr({ children }) {
      return <tr className="transition-colors hover:bg-subtle/40">{children}</tr>;
    },

    th({ children }) {
      return <th className="px-4 py-3 font-semibold text-foreground">{children}</th>;
    },

    td({ children }) {
      return <td className="px-4 py-3 align-top text-foreground/90">{children}</td>;
    },

    blockquote({ children }) {
      const text = extractText(children).trim();
      const isAiCallout =
        text.startsWith('AI Insight') ||
        text.startsWith('💡') ||
        text.startsWith('[!TIP]') ||
        text.startsWith('[!IMPORTANT]');
      const isWarning = text.startsWith('[!WARNING]') || text.startsWith('⚠');

      return (
        <blockquote
          className={cn(
            'my-6 rounded-r-lg border-l-2 px-4 py-3 not-italic',
            isAiCallout
              ? 'border-ai bg-ai-soft/70 text-foreground'
              : isWarning
                ? 'border-amber-500 bg-amber-500/10 text-foreground'
                : 'border-accent bg-subtle/70 text-foreground/90'
          )}
        >
          {children}
        </blockquote>
      );
    },

    a({ href, children, ...props }) {
      const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
      return (
        <a
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="font-medium text-accent underline decoration-accent/40 underline-offset-4 transition hover:text-accent-hover hover:decoration-accent"
          {...props}
        >
          {children}
        </a>
      );
    },

    img({ src, alt }) {
      return <LightboxImage src={src} alt={alt} />;
    },
  };

  return (
    <div
      className={cn(
        'prose prose-zinc dark:prose-invert prose-research max-w-none',
        'prose-headings:font-serif prose-headings:tracking-tight prose-headings:text-foreground',
        'prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground',
        'prose-hr:border-border',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeSlug, rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
