import { useSearchParams } from 'react-router-dom';
import { Globe, Image as ImageIcon } from 'lucide-react';
import { DomainManagementPage } from '@/features/domains/DomainManagementPage';
import { MediaLibraryPage } from '@/features/admin/MediaLibraryPage';
import { cn } from '@/lib/utils';

export function ResourceHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'media' ? 'media' : 'domains';

  const switchTab = (next: 'domains' | 'media') => {
    setSearchParams(next === 'domains' ? {} : { tab: 'media' }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="px-6 pt-6 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            Tài nguyên chung &amp; Lĩnh vực Khoa học
          </h1>
          <p className="text-sm text-muted mt-1">
            Kho dùng chung toàn viện: Lĩnh vực chiến lược, Dataset, Codebase và Thư viện Media.
          </p>
        </div>

        <div className="inline-flex rounded-full border border-border bg-surface p-1 self-start">
          <button
            type="button"
            onClick={() => switchTab('domains')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'domains'
                ? 'bg-foreground text-canvas'
                : 'text-muted hover:text-foreground'
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            Lĩnh vực &amp; Datasets
          </button>
          <button
            type="button"
            onClick={() => switchTab('media')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'media'
                ? 'bg-foreground text-canvas'
                : 'text-muted hover:text-foreground'
            )}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Thư viện Media
          </button>
        </div>
      </div>

      {activeTab === 'domains' ? <DomainManagementPage /> : <MediaLibraryPage />}
    </div>
  );
}
