import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  Check,
  Cpu,
  Database,
  Edit3,
  FileCode2,
  Globe,
  GraduationCap,
  Home,
  Layers,
  Plus,
  Scale,
  Search,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useDomains } from '@/context/DomainContext';
import {
  addDomainMember,
  createDomainResource,
  deleteDomainResource,
  fetchDomainMembers,
  fetchDomainResources,
  removeDomainMember,
} from '@/features/domains/api';
import { cn, slugify } from '@/lib/utils';
import type {
  DomainFacultyRole,
  DomainInput,
  DomainMemberType,
  ResearchDomain,
  ResearchDomainMember,
  ResearchDomainResource,
  ScientificResourceType,
} from '@/types/database';

const ICON_OPTIONS = [
  { name: 'Cpu', icon: Cpu, label: 'Công nghệ / AI' },
  { name: 'Activity', icon: Activity, label: 'Y sinh / Khoa học sự sống' },
  { name: 'GraduationCap', icon: GraduationCap, label: 'Giáo dục / Nhận thức' },
  { name: 'Home', icon: Home, label: 'Gia đình / Xã hội' },
  { name: 'Scale', icon: Scale, label: 'Kinh tế / Pháp chế' },
  { name: 'Globe', icon: Globe, label: 'Tổng quan / Thể chế' },
];

const COLOR_PRESETS = [
  '#ffffff',
  '#e0e0e0',
  '#9aa0a6',
  '#5f6368',
];

const FACULTY_ROLES: Array<{ role: DomainFacultyRole; label: string }> = [
  { role: 'chair_lead', label: 'Trưởng ban / Chair Lead' },
  { role: 'principal_investigator', label: 'Nghiên cứu viên chính (PI)' },
  { role: 'lead_reviewer', label: 'Trưởng ban Phản biện đồng đẳng' },
  { role: 'researcher', label: 'Nghiên cứu viên' },
  { role: 'fellow', label: 'Cộng tác viên / Nghiên cứu sinh' },
  { role: 'advisor', label: 'Cố vấn Chiến lược' },
];

const RESOURCE_TYPES: Array<{ type: ScientificResourceType; label: string }> = [
  { type: 'dataset', label: 'Bộ dữ liệu thực nghiệm (Dataset)' },
  { type: 'benchmark_suite', label: 'Kịch bản đo kiểm (Benchmark Suite)' },
  { type: 'code_artifact', label: 'Mã nguồn / Trọng số (Code Artifact)' },
  { type: 'methodology_spec', label: 'Đặc tả phương pháp luận (Protocol)' },
  { type: 'telemetry_dump', label: 'Bản ghi Telemetry / Logs' },
  { type: 'peer_review', label: 'Thẩm định phản biện (Peer Review)' },
  { type: 'domain_handbook', label: 'Cẩm nang tiêu chuẩn nghiệp vụ' },
];

export function DomainManagementPage() {
  const {
    domains,
    myDomains,
    createDomain,
    updateDomain,
    deleteDomain,
    canManageDomain,
    isMyDomain,
    setSelectedDomainId,
  } = useDomains();

  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDomain, setEditingDomain] = useState<ResearchDomain | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inspectingDomain, setInspectingDomain] = useState<ResearchDomain | null>(null);

  // Stats
  const stats = useMemo(() => {
    const totalCount = domains.length;
    const myCount = myDomains.length;
    const totalReports = domains.reduce((acc, d) => acc + (d.report_count || 0), 0);
    const totalResources = domains.reduce((acc, d) => acc + (d.resource_count || 0), 0);
    return { totalCount, myCount, totalReports, totalResources };
  }, [domains, myDomains]);

  // Filtered List
  const displayDomains = useMemo(() => {
    const list = activeTab === 'my' ? myDomains : domains;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.tagline && d.tagline.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        (d.chair_lead && d.chair_lead.toLowerCase().includes(q))
    );
  }, [domains, myDomains, activeTab, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingDomain(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (d: ResearchDomain) => {
    setEditingDomain(d);
    setIsModalOpen(true);
  };

  const handleDelete = async (domain: ResearchDomain) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa miền nghiên cứu "${domain.name}"? Thao tác này sẽ giải tán phân vùng và các tài nguyên liên kết.`
      )
    ) {
      return;
    }
    try {
      await deleteDomain(domain.id);
      toast.success(`Đã xóa miền nghiên cứu "${domain.name}"`);
    } catch (err: any) {
      toast.error(`Không thể xóa miền: ${err.message || 'Lỗi không xác định'}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-subtle text-foreground">
              <Globe className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-muted">
              Research Domains Governance
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
            Quản trị Miền Nghiên Cứu
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Tạo lập và chủ trì các phân vùng nghiên cứu độc lập. Mỗi thành viên có thể chọn lĩnh vực làm việc, quản lý hội đồng khoa học và kho tài nguyên thực nghiệm riêng.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-canvas hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Tạo Miền Nghiên Cứu Mới
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted">Tổng Lĩnh Vực</p>
          <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
            {stats.totalCount}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted">Miền Do Bạn Tạo</p>
          <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
            {stats.myCount}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted">Báo Cáo Xuất Bản</p>
          <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
            {stats.totalReports}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted">Tài Nguyên Thực Nghiệm</p>
          <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
            {stats.totalResources}
          </p>
        </div>
      </div>

      {/* Filter and Tabs */}
      <div className="bg-surface border border-border rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'deepmind-pill-tab',
              activeTab === 'all' && 'active'
            )}
          >
            Tất cả lĩnh vực ({domains.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={cn(
              'deepmind-pill-tab flex items-center gap-1.5',
              activeTab === 'my' && 'active'
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            Lĩnh vực của tôi ({myDomains.length})
          </button>
        </div>

        <div className="relative min-w-[240px] sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, tagline, trưởng ban..."
            className="w-full rounded-lg border border-border bg-canvas pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Domains Grid */}
      {displayDomains.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-surface/40">
          <Layers className="mx-auto h-8 w-8 text-muted mb-3" />
          <h3 className="text-sm font-semibold text-foreground">Chưa có miền nghiên cứu nào phù hợp</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            {activeTab === 'my'
              ? 'Tài khoản của bạn chưa tạo miền nghiên cứu nào. Nhấn "Tạo Miền Nghiên Cứu Mới" để thành lập phân vùng học thuật đầu tiên!'
              : 'Không tìm thấy miền nghiên cứu khớp với từ khóa tìm kiếm.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-canvas hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Tạo Miền Mới Ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayDomains.map((domain) => {
            const IconComponent =
              ICON_OPTIONS.find((i) => i.name === domain.icon)?.icon || Sparkles;
            const isOwner = isMyDomain(domain);
            const canManage = canManageDomain(domain);

            return (
              <div
                key={domain.id}
                className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between transition-colors hover:border-border/80 relative group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-border bg-subtle text-foreground">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                          {domain.slug}
                        </span>
                        <h3 className="font-sans font-semibold text-base text-foreground leading-snug line-clamp-1">
                          {domain.name}
                        </h3>
                      </div>
                    </div>

                    {isOwner ? (
                      <span className="rounded-full border border-border bg-subtle px-2 py-0.5 text-[10px] font-mono text-foreground shrink-0">
                        Miền của bạn
                      </span>
                    ) : !domain.created_by ? (
                      <span className="rounded-full border border-border/40 bg-transparent px-2 py-0.5 text-[10px] font-mono text-muted shrink-0">
                        Toàn viện
                      </span>
                    ) : null}
                  </div>

                  {domain.tagline && (
                    <p className="text-xs font-medium text-foreground/90 mb-2 line-clamp-2">
                      {domain.tagline}
                    </p>
                  )}

                  {domain.description && (
                    <p className="text-xs text-muted leading-relaxed mb-4 line-clamp-3">
                      {domain.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-border/70 mt-2">
                  <div className="text-[11px] text-muted mb-3 flex items-center gap-1.5 truncate">
                    <Award className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span className="truncate">
                      Chủ trì: <strong className="text-foreground">{domain.chair_lead || 'Chưa chỉ định'}</strong>
                    </span>
                  </div>

                  {/* Counters */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-subtle/50 rounded-lg text-center mb-4 border border-border/40">
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        {domain.report_count ?? 0}
                      </div>
                      <div className="text-[10px] text-muted">Báo cáo</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        {domain.member_count ?? 0}
                      </div>
                      <div className="text-[10px] text-muted">Hội đồng</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        {domain.resource_count ?? 0}
                      </div>
                      <div className="text-[10px] text-muted">Tài nguyên</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDomainId(domain.id);
                        toast.success(`Đã chọn làm việc tại miền: ${domain.name}`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-subtle transition-colors"
                      title="Chọn miền này làm không gian nghiên cứu mặc định"
                    >
                      <Check className="w-3.5 h-3.5 text-foreground" />
                      Chọn làm việc
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInspectingDomain(domain)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-canvas px-2 py-1.5 text-xs text-muted hover:text-foreground hover:bg-subtle transition-colors"
                        title="Quản lý thành viên & tài nguyên"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Hội đồng & Kho</span>
                      </button>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(domain)}
                          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-subtle transition-colors"
                          title="Sửa thông tin miền"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canManage && isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDelete(domain)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Xóa miền nghiên cứu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Domain Modal */}
      {isModalOpen && (
        <CreateEditDomainModal
          domain={editingDomain}
          onClose={() => setIsModalOpen(false)}
          onSave={async (payload) => {
            if (editingDomain) {
              await updateDomain(editingDomain.id, payload);
              toast.success(`Đã cập nhật miền "${payload.name}"`);
            } else {
              await createDomain(payload);
              toast.success(`Đã thành lập miền nghiên cứu "${payload.name}"`);
            }
            setIsModalOpen(false);
          }}
        />
      )}

      {/* Inspect / Manage Faculty & Resources Modal */}
      {inspectingDomain && (
        <DomainFacultyAndResourcesModal
          domain={inspectingDomain}
          canManage={canManageDomain(inspectingDomain)}
          onClose={() => setInspectingDomain(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Modal: Create / Edit Research Domain
// ============================================================================

interface CreateEditDomainModalProps {
  domain: ResearchDomain | null;
  onClose: () => void;
  onSave: (payload: DomainInput) => Promise<void>;
}

function CreateEditDomainModal({ domain, onClose, onSave }: CreateEditDomainModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState(domain?.name || '');
  const [slug, setSlug] = useState(domain?.slug || '');
  const [tagline, setTagline] = useState(domain?.tagline || '');
  const [description, setDescription] = useState(domain?.description || '');
  const [icon, setIcon] = useState(domain?.icon || 'Cpu');
  const [color, setColor] = useState(domain?.color || COLOR_PRESETS[0]);
  const [chairLead, setChairLead] = useState(domain?.chair_lead || user?.email || '');
  const [isActive, setIsActive] = useState(domain ? domain.is_active : true);
  const [saving, setSaving] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!domain) {
      setSlug(slugify(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên miền nghiên cứu.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        icon,
        color,
        sort_order: domain ? domain.sort_order : 10,
        is_active: isActive,
        chair_lead: chairLead.trim() || null,
        created_by: domain ? domain.created_by : user?.id || null,
      });
    } catch (err: any) {
      toast.error(`Lỗi khi lưu miền: ${err.message || 'Lỗi không xác định'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {ICON_OPTIONS.find((i) => i.name === icon)?.icon ? (
              (() => {
                const Comp = ICON_OPTIONS.find((i) => i.name === icon)!.icon;
                return <Comp className="w-4 h-4" />;
              })()
            ) : (
              <Cpu className="w-4 h-4" />
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {domain ? 'Chỉnh sửa Miền Nghiên Cứu' : 'Thành lập Miền Nghiên Cứu Mới'}
            </h2>
            <p className="text-xs text-muted">
              Xác lập không gian học thuật chuyên sâu và tài nguyên khoa học.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Tên miền nghiên cứu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="VD: Gia đình Số & Nuôi dạy con thông minh"
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Slug URL</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="gia-dinh-so"
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Trưởng ban / Chair Lead
              </label>
              <input
                type="text"
                value={chairLead}
                onChange={(e) => setChairLead(e.target.value)}
                placeholder="Tên nghiên cứu viên chủ trì"
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Tôn chỉ / Hướng tiếp cận học thuật (Tagline)
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="VD: Digital Family, Cognitive Ergonomics & Human Co-existence"
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Phạm vi nghiên cứu chi tiết
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả phạm vi giải quyết vấn đề, các mô hình thực nghiệm và đối tượng thụ hưởng..."
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Biểu tượng</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(({ name: iName, icon: Icon, label }) => (
                <button
                  key={iName}
                  type="button"
                  onClick={() => setIcon(iName)}
                  title={label}
                  className={cn(
                    'p-2 rounded-lg border flex items-center justify-center transition-colors',
                    icon === iName
                      ? 'border-accent bg-accent-soft text-accent ring-1 ring-accent'
                      : 'border-border bg-canvas text-muted hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Màu sắc chủ đạo</label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-6 h-6 rounded-full border flex items-center justify-center transition-all',
                    c === '#ffffff' ? 'border-border' : 'border-transparent',
                    color === c ? 'scale-110 ring-2 ring-foreground/40' : 'opacity-80 hover:opacity-100'
                  )}
                  style={{ backgroundColor: c }}
                >
                  {color === c && (
                    <Check
                      className={cn(
                        'w-3 h-3',
                        c === '#ffffff' || c === '#e0e0e0' ? 'text-black' : 'text-white'
                      )}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="domain-active-toggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-border text-accent focus:ring-accent"
            />
            <label htmlFor="domain-active-toggle" className="text-xs text-foreground font-medium">
              Kích hoạt hiển thị công khai trên Thư viện Nghiên cứu
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-subtle"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-canvas hover:opacity-90 disabled:opacity-50 transition-opacity shadow-xs"
            >
              {saving ? 'Đang lưu...' : domain ? 'Lưu thay đổi' : 'Tạo Miền'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Modal: Domain Faculty & Scientific Resources Management
// ============================================================================

interface DomainFacultyAndResourcesModalProps {
  domain: ResearchDomain;
  canManage: boolean;
  onClose: () => void;
}

function DomainFacultyAndResourcesModal({
  domain,
  canManage,
  onClose,
}: DomainFacultyAndResourcesModalProps) {
  const [subTab, setSubTab] = useState<'members' | 'resources'>('members');
  const [members, setMembers] = useState<ResearchDomainMember[]>([]);
  const [resources, setResources] = useState<ResearchDomainResource[]>([]);
  const [loading, setLoading] = useState(true);

  // Add member modal form state
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberType, setNewMemberType] = useState<DomainMemberType>('human');
  const [newMemberAid, setNewMemberAid] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<DomainFacultyRole>('researcher');
  const [newMemberSpecialty, setNewMemberSpecialty] = useState('');

  // Add resource modal form state
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [newResTitle, setNewResTitle] = useState('');
  const [newResType, setNewResType] = useState<ScientificResourceType>('dataset');
  const [newResDesc, setNewResDesc] = useState('');
  const [newResFileUrl, setNewResFileUrl] = useState('');
  const [newResDoi, setNewResDoi] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, r] = await Promise.all([
        fetchDomainMembers(domain.id),
        fetchDomainResources(domain.id),
      ]);
      setMembers(m);
      setResources(r);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [domain.id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      toast.error('Vui lòng nhập tên thành viên.');
      return;
    }
    try {
      await addDomainMember({
        domain_id: domain.id,
        user_id: null,
        member_name: newMemberName.trim(),
        email: newMemberEmail.trim() || null,
        avatar_url: null,
        member_type: newMemberType,
        persona_aid: newMemberType === 'ai_persona' ? newMemberAid.trim() || 'AI-AGENT' : null,
        role: newMemberRole,
        specialty_focus: newMemberSpecialty.trim() || null,
        permissions: {
          can_publish_report: true,
          can_review_draft: true,
          can_manage_datasets: true,
          can_manage_telemetry: true,
          can_invite_fellow: false,
        },
        status: 'active',
      });
      toast.success(`Đã thêm thành viên "${newMemberName}" vào Hội đồng`);
      setIsAddingMember(false);
      setNewMemberName('');
      setNewMemberEmail('');
      void loadData();
    } catch (err: any) {
      toast.error(`Lỗi khi thêm thành viên: ${err.message}`);
    }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (!window.confirm(`Xác nhận xóa thành viên "${name}" khỏi Hội đồng?`)) return;
    try {
      await removeDomainMember(id);
      toast.success('Đã xóa thành viên');
      void loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề tài nguyên.');
      return;
    }
    try {
      await createDomainResource({
        domain_id: domain.id,
        report_id: null,
        title: newResTitle.trim(),
        slug: slugify(newResTitle),
        resource_type: newResType,
        description: newResDesc.trim() || null,
        content_md: '',
        file_url: newResFileUrl.trim() || null,
        doi_or_arxiv: newResDoi.trim() || null,
        telemetry_payload: {},
        tags: [],
        access_level: 'domain_only',
        created_by: null,
        created_by_member_id: null,
      });
      toast.success(`Đã thêm tài nguyên "${newResTitle}"`);
      setIsAddingResource(false);
      setNewResTitle('');
      setNewResFileUrl('');
      setNewResDesc('');
      void loadData();
    } catch (err: any) {
      toast.error(`Lỗi khi tạo tài nguyên: ${err.message}`);
    }
  };

  const handleDeleteResource = async (id: string, title: string) => {
    if (!window.confirm(`Xác nhận xóa tài nguyên "${title}"?`)) return;
    try {
      await deleteDomainResource(id);
      toast.success('Đã xóa tài nguyên');
      void loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-surface p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: domain.color }}
            />
            <span className="text-xs font-mono text-muted uppercase tracking-wider">
              {domain.slug}
            </span>
          </div>
          <h2 className="text-lg font-serif font-semibold text-foreground">
            {domain.name}
          </h2>
          <p className="text-xs text-muted mt-0.5 line-clamp-1">
            {domain.tagline || domain.description}
          </p>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2 mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('members')}
            className={cn(
              'deepmind-pill-tab flex items-center gap-1.5',
              subTab === 'members' && 'active'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Hội đồng Khoa học ({members.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('resources')}
            className={cn(
              'deepmind-pill-tab flex items-center gap-1.5',
              subTab === 'resources' && 'active'
            )}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Tài nguyên Nghiên cứu ({resources.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {subTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">
                  Danh sách nhà khoa học, nghiên cứu sinh và tác tử AI chuyên trách thuộc phân ban.
                </p>
                {canManage && !isAddingMember && (
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-canvas hover:opacity-90 transition-opacity shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Thêm Thành viên
                  </button>
                )}
              </div>

              {/* Form Add Member */}
              {isAddingMember && (
                <form
                  onSubmit={handleAddMember}
                  className="rounded-xl border border-accent/40 bg-accent-soft/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground">
                      Thêm Thành viên Hội đồng / Tác tử AI
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingMember(false)}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Họ tên / Tên Tác tử <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="VD: TS. Nguyễn Văn A hoặc An"
                        className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Email liên lạc
                      </label>
                      <input
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="researcher@i2flabs.org"
                        className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Loại thành viên
                      </label>
                      <select
                        value={newMemberType}
                        onChange={(e) => setNewMemberType(e.target.value as DomainMemberType)}
                        className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                      >
                        <option value="human">Con người (Human)</option>
                        <option value="ai_persona">Tác tử AI (AI Persona)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Vai trò học thuật
                      </label>
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as DomainFacultyRole)}
                        className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                      >
                        {FACULTY_ROLES.map((r) => (
                          <option key={r.role} value={r.role}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Mã Persona AID
                      </label>
                      <input
                        type="text"
                        value={newMemberAid}
                        onChange={(e) => setNewMemberAid(e.target.value)}
                        placeholder="VD: ENG-AN-7B9F1D"
                        className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      Mảng chuyên môn phụ trách
                    </label>
                    <input
                      type="text"
                      value={newMemberSpecialty}
                      onChange={(e) => setNewMemberSpecialty(e.target.value)}
                      placeholder="VD: Thụ thể nơ-ron, Tối ưu hóa bộ nhớ, Kiểm toán định lượng..."
                      className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingMember(false)}
                      className="px-3 py-1 rounded-lg border border-border text-xs text-muted hover:text-foreground"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 rounded-full bg-foreground text-canvas text-xs font-medium hover:opacity-90 transition-opacity shadow-xs"
                    >
                      Lưu thành viên
                    </button>
                  </div>
                </form>
              )}

              {/* Members List */}
              {loading ? (
                <div className="text-center py-8 text-xs text-muted">Đang tải thành viên...</div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-xl">
                  <UserCheck className="mx-auto h-6 w-6 text-muted mb-2" />
                  <p className="text-xs text-muted">Chưa có thành viên nào trong phân ban này.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-canvas hover:bg-subtle/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-border bg-subtle text-foreground flex items-center justify-center font-medium text-xs shrink-0">
                          {m.member_name[0]?.toUpperCase() || 'M'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {m.member_name}
                            </span>
                            <span className="rounded border border-border/50 bg-subtle px-1.5 py-0.5 text-[10px] font-mono text-muted">
                              {FACULTY_ROLES.find((r) => r.role === m.role)?.label || m.role}
                            </span>
                            {m.member_type === 'ai_persona' && (
                              <span className="rounded border border-border/70 bg-canvas px-1.5 py-0.5 text-[10px] font-mono text-muted">
                                {m.persona_aid || 'AID'}
                              </span>
                            )}
                          </div>
                          {m.specialty_focus && (
                            <p className="text-[11px] text-muted mt-0.5">{m.specialty_focus}</p>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id, m.member_name)}
                          className="p-1.5 text-muted hover:text-red-500 rounded-lg hover:bg-subtle transition-colors"
                          title="Xóa thành viên"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {subTab === 'resources' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">
                  Kho dữ liệu thực nghiệm, kịch bản đo kiểm (benchmarks) và hồ sơ đặc tả phương pháp luận.
                </p>
                {canManage && !isAddingResource && (
                  <button
                    type="button"
                    onClick={() => setIsAddingResource(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-canvas hover:opacity-90 transition-opacity shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm Tài nguyên
                  </button>
                )}
              </div>

              {/* Form Add Resource */}
              {isAddingResource && (
                <form
                  onSubmit={handleAddResource}
                  className="rounded-xl border border-accent/40 bg-accent-soft/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground">
                      Thêm Tài nguyên Khoa học Mới
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingResource(false)}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Đóng
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Tiêu đề tài nguyên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newResTitle}
                        onChange={(e) => setNewResTitle(e.target.value)}
                        placeholder="VD: Human-AI Flow Latency Benchmark 2026"
                        className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        Loại tài nguyên
                      </label>
                      <select
                        value={newResType}
                        onChange={(e) => setNewResType(e.target.value as ScientificResourceType)}
                        className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                      >
                        {RESOURCE_TYPES.map((t) => (
                          <option key={t.type} value={t.type}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        URL Tệp Dữ liệu / Artifacts
                      </label>
                      <input
                        type="url"
                        value={newResFileUrl}
                        onChange={(e) => setNewResFileUrl(e.target.value)}
                        placeholder="https://... hoặc đường dẫn storage"
                        className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-foreground mb-1">
                        DOI hoặc arXiv ID
                      </label>
                      <input
                        type="text"
                        value={newResDoi}
                        onChange={(e) => setNewResDoi(e.target.value)}
                        placeholder="10.1000/182 hoặc 2609.12345"
                        className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">
                      Mô tả nội dung tài nguyên
                    </label>
                    <textarea
                      rows={2}
                      value={newResDesc}
                      onChange={(e) => setNewResDesc(e.target.value)}
                      placeholder="Mô tả thông số mẫu, cấu hình máy quét và quy chuẩn kiểm định..."
                      className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingResource(false)}
                      className="px-3 py-1 rounded-lg border border-border text-xs text-muted hover:text-foreground"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 rounded-full bg-foreground text-canvas text-xs font-medium hover:opacity-90 transition-opacity shadow-xs"
                    >
                      Tạo tài nguyên
                    </button>
                  </div>
                </form>
              )}

              {/* Resources List */}
              {loading ? (
                <div className="text-center py-8 text-xs text-muted">Đang tải tài nguyên...</div>
              ) : resources.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-xl">
                  <Database className="mx-auto h-6 w-6 text-muted mb-2" />
                  <p className="text-xs text-muted">Chưa có tài nguyên học thuật nào được lưu trữ.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {resources.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-canvas hover:bg-subtle/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-subtle text-foreground flex items-center justify-center shrink-0">
                          <FileCode2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {r.title}
                            </span>
                            <span className="rounded border border-border/60 bg-subtle px-1.5 py-0.5 text-[10px] font-mono text-muted">
                              {RESOURCE_TYPES.find((t) => t.type === r.resource_type)?.label ||
                                r.resource_type}
                            </span>
                            {r.doi_or_arxiv && (
                              <span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] font-mono text-muted">
                                {r.doi_or_arxiv}
                              </span>
                            )}
                          </div>
                          {r.description && (
                            <p className="text-[11px] text-muted mt-0.5 line-clamp-1">
                              {r.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {r.file_url && (
                          <a
                            href={r.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent hover:underline font-medium"
                          >
                            Tải tệp
                          </a>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDeleteResource(r.id, r.title)}
                            className="p-1.5 text-muted hover:text-red-500 rounded-lg hover:bg-subtle transition-colors"
                            title="Xóa tài nguyên"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
