import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bot,
  Flame,
  FolderArchive,
  Search,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDomains } from '@/context/DomainContext';
import { fetchAllReportsAdmin } from '@/features/admin/api';
import {
  VENTURE_STAGE_META,
  fetchProblemSkills,
  fetchResearchVentures,
} from '@/features/foundry/api';
import {
  fetchAllDomainMembers,
  fetchResearchTasks,
  fetchResearcherAiAgents,
  fetchResearcherProfiles,
} from '@/features/workspace/api';

import app01Img from '@/assets/apps/app-01-playground.jpg';
import app02Img from '@/assets/apps/app-02-researchers.jpg';
import app04Img from '@/assets/apps/app-04-products.jpg';
import app06Img from '@/assets/apps/app-06-tasks.jpg';

export function AdminLauncherPage() {
  const { adminProfile, user } = useAuth();
  const { domains, selectedDomainId } = useDomains();
  const [search, setSearch] = useState('');

  const displayName =
    adminProfile?.display_name || user?.email?.split('@')[0] || 'Researcher';

  const { data: ventures = [] } = useQuery({
    queryKey: ['foundry-ventures', selectedDomainId],
    queryFn: () => fetchResearchVentures(selectedDomainId),
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['foundry-skills', 'all'],
    queryFn: () => fetchProblemSkills(),
  });

  const { data: aiAgents = [] } = useQuery({
    queryKey: ['ws-ai-agents', selectedDomainId],
    queryFn: () => fetchResearcherAiAgents(selectedDomainId),
  });

  const { data: domainMembers = [] } = useQuery({
    queryKey: ['ws-all-members'],
    queryFn: fetchAllDomainMembers,
  });

  const { data: researcherProfiles = [] } = useQuery({
    queryKey: ['ws-researcher-profiles'],
    queryFn: fetchResearcherProfiles,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['ws-tasks', selectedDomainId],
    queryFn: () => fetchResearchTasks(selectedDomainId),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: fetchAllReportsAdmin,
  });

  const humanCount = useMemo(() => {
    const set = new Set<string>();
    for (const p of researcherProfiles) {
      set.add(p.display_name.trim().toLowerCase());
    }
    for (const m of domainMembers) {
      if (m.member_type === 'human') set.add(m.member_name.trim().toLowerCase());
    }
    for (const a of aiAgents) {
      set.add(a.owner_name.trim().toLowerCase());
    }
    return set.size;
  }, [researcherProfiles, domainMembers, aiAgents]);

  const apps = useMemo(
    () => [
      {
        id: 'research-playground',
        title: 'Research Playground.',
        subtitle:
          'Đăng ý tưởng nghiên cứu dạng social, đào sâu cùng AI, dựng MVP & đúc kết kỹ năng.',
        to: '/admin/forge',
        image: app01Img,
        badge: `${ventures.length} dự án · ${skills.filter((s) => s.maturity_level !== 'gap').length} kỹ năng`,
        keywords: 'playground foundry social y tuong de tai nghien cuu mvp unikorn',
      },
      {
        id: 'publications',
        title: 'Ấn phẩm & Báo cáo.',
        subtitle:
          'Soạn thảo, import Markdown từ Aevum OS, thẩm định và xuất bản bài nghiên cứu ra trang chủ.',
        to: '/admin/reports',
        image: app04Img,
        badge: `${reports.filter((r) => r.status === 'published').length}/${reports.length} bài xuất bản`,
        keywords: 'an pham bao cao reports cms whitepaper xuat ban markdown',
      },
      {
        id: 'tasks-bounties',
        title: 'Task & Bounties.',
        subtitle:
          'Bảng Kanban kéo thả phân bổ đầu việc & Open Bounties giữa con người với AI Fleet.',
        to: '/admin/tasks',
        image: app06Img,
        badge: `${tasks.filter((t) => t.status !== 'done').length} việc · ${tasks.filter((t) => t.is_bounty && t.status !== 'done').length} Bounties`,
        keywords: 'task bounties kanban keo tha cong viec',
      },
      {
        id: 'researchers-ai',
        title: 'Đội ngũ & Cộng sự AI.',
        subtitle:
          'Quản lý Human Researchers và dàn Personal AI Twins chuyên môn riêng của từng người.',
        to: '/admin/researchers',
        image: app02Img,
        badge: `${humanCount} Humans · ${aiAgents.length} AI Twins`,
        keywords: 'doi ngu nhan su human researcher ai agent cong su so twin',
      },
    ],
    [ventures.length, skills, reports, tasks, humanCount, aiAgents.length]
  );

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (app) =>
        app.title.toLowerCase().includes(q) ||
        app.subtitle.toLowerCase().includes(q) ||
        app.keywords.includes(q)
    );
  }, [apps, search]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header + Quick Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              I2FLabs Research OS · {humanCount} Researchers · {aiAgents.length} Cộng sự AI
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-semibold text-foreground tracking-tight">
            Chào {displayName}, hôm nay cùng khám phá gì?
          </h1>
          <p className="text-sm text-muted max-w-2xl">
            Cổng làm việc tinh gọn của I2FLabs: đi từ ý tưởng nghiên cứu cộng sinh đến xuất bản tri thức chuẩn xác.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm không gian..."
              className="w-full sm:w-52 rounded-full border border-border bg-surface pl-9 pr-3.5 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-foreground/50"
            />
          </div>

          <Link
            to="/admin/forge"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-canvas hover:opacity-90"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Đăng ý tưởng mới
          </Link>
        </div>
      </div>

      {/* 4 Core Style-1 Portrait App Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredApps.map((app) => (
          <Link
            key={app.id}
            to={app.to}
            className="group relative flex flex-col justify-end overflow-hidden rounded-[28px] border border-border/70 bg-surface min-h-[370px] sm:min-h-[400px] shadow-[0_18px_45px_-16px_rgba(37,99,235,0.12)] hover:shadow-[0_26px_60px_-14px_rgba(37,99,235,0.22)] hover:border-foreground/30 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="absolute inset-x-0 top-0 h-[72%] overflow-hidden pointer-events-none">
              <img
                src={app.image}
                alt={app.title}
                loading="lazy"
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04] dark:brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 via-25% to-transparent" />
            </div>

            <div className="absolute top-4 right-4 z-10">
              <span className="inline-flex items-center rounded-full bg-white/75 dark:bg-black/50 backdrop-blur-md border border-black/5 dark:border-white/10 px-2.5 py-1 text-[11px] font-medium text-neutral-800 dark:text-neutral-200 shadow-xs">
                {app.badge}
              </span>
            </div>

            <div className="relative z-10 px-6 pb-6 pt-28 space-y-2 bg-gradient-to-t from-surface via-surface/95 to-transparent">
              <h2 className="text-[19px] font-semibold text-foreground tracking-tight leading-snug">
                {app.title}
              </h2>
              <p className="text-[13px] text-muted leading-relaxed line-clamp-2">
                {app.subtitle}
              </p>
              <div className="pt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                <span>Explore</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Compact Pulse + Resources Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Đang thảo luận tại Research Playground</span>
            </div>
            <Link to="/admin/forge" className="text-xs font-medium text-muted hover:text-foreground">
              Xem tất cả →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ventures.length === 0 ? (
              <div className="sm:col-span-2 rounded-xl border border-dashed border-border bg-canvas p-4 text-xs text-muted">
                Chưa có chủ đề nào trong DB. Hãy bắt đầu ý tưởng đầu tiên tại Research Playground.
              </div>
            ) : (
              ventures.slice(0, 2).map((v) => {
                const stageMeta =
                  VENTURE_STAGE_META.find((m) => m.stage === v.stage) ?? VENTURE_STAGE_META[0];
                return (
                  <Link
                    key={v.id}
                    to={`/admin/forge/${v.slug}`}
                    className="rounded-xl border border-border/80 bg-canvas p-3 space-y-1 hover:border-foreground/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-medium text-foreground">{stageMeta.socialLabel}</span>
                      <span className="text-muted">Vòng #{v.cycle_number}</span>
                    </div>
                    <div className="text-xs font-semibold text-foreground line-clamp-1">{v.title}</div>
                    <div className="text-[11px] text-muted line-clamp-1">
                      {v.lead_human_name} · AI {v.lead_ai_name}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-border bg-surface p-4 sm:p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Bot className="w-4 h-4 text-emerald-500" />
              <span>Cộng sự AI ({aiAgents.length})</span>
            </div>
            <Link
              to="/admin/resources"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-subtle"
            >
              <FolderArchive className="w-3 h-3" />
              Tài nguyên &amp; Lĩnh vực ({domains.length})
            </Link>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {aiAgents.length === 0 ? (
              <span className="text-xs text-muted">Chưa có Cộng sự AI nào trong DB.</span>
            ) : (
              aiAgents.slice(0, 5).map((ai) => (
                <Link
                  key={ai.id}
                  to="/admin/researchers"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-subtle"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {ai.agent_name}
                </Link>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
            <Link to="/admin/resources?tab=media" className="text-muted hover:text-foreground">
              Thư viện Media &amp; Sơ đồ →
            </Link>
            <Link to="/admin/reports/new" className="font-medium text-foreground hover:underline">
              + Viết báo cáo mới
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
