import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  FlaskConical,
  GitBranch,
  HandHelping,
  Home,
  Lightbulb,
  Link2,
  MessageCircle,
  Rocket,
  Sparkles,
  UserPlus,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDomains } from '@/context/DomainContext';
import { useAuth } from '@/context/AuthContext';
import {
  COMPETENCY_AXIS_LABELS,
  VENTURE_STAGE_META,
  createQuickSparkVenture,
  fetchContributionLedger,
  fetchProblemSkills,
  fetchResearchVentures,
  fetchVentureParticipants,
  fetchVentureTelemetry,
  getMyUpvotedVentureIds,
  joinVenturePod,
  toggleVentureUpvoteInDb,
} from '@/features/foundry/api';
import { CompetencyAxisIcon, StageIcon } from '@/features/foundry/foundryIcons';
import { fetchResearcherAiAgents } from '@/features/workspace/api';
import { cn } from '@/lib/utils';
import type { ResearchVenture, VentureStage } from '@/types/database';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function FoundryListPage() {
  const { selectedDomainId } = useDomains();
  const { adminProfile, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const composerRef = useRef<HTMLInputElement | null>(null);

  const currentHumanName =
    adminProfile?.display_name || user?.email?.split('@')[0] || 'Researcher';

  const stageFilter = (searchParams.get('stage') as VentureStage | 'all') || 'all';
  const setStageFilter = (next: VentureStage | 'all') => {
    setSearchParams(next === 'all' ? {} : { stage: next }, { replace: true });
  };

  const [composerExpanded, setComposerExpanded] = useState(false);
  const [postIntent, setPostIntent] = useState<VentureStage>('vibe_spark');
  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [mvpUrl, setMvpUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [leadAi, setLeadAi] = useState('');
  const [likedIds, setLikedIds] = useState<string[]>(() => getMyUpvotedVentureIds());

  const { data: ventures = [], isLoading } = useQuery({
    queryKey: ['foundry-ventures', selectedDomainId],
    queryFn: () => fetchResearchVentures(selectedDomainId),
  });

  const { data: allSkills = [] } = useQuery({
    queryKey: ['foundry-skills', 'all'],
    queryFn: () => fetchProblemSkills(),
  });

  const { data: allTelemetry = [] } = useQuery({
    queryKey: ['foundry-telemetry', 'all'],
    queryFn: () => fetchVentureTelemetry(),
  });

  const { data: aiAgents = [] } = useQuery({
    queryKey: ['ws-ai-agents', selectedDomainId],
    queryFn: () => fetchResearcherAiAgents(selectedDomainId),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['foundry-participants', 'all'],
    queryFn: () => fetchVentureParticipants(),
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ['foundry-ledger', 'all'],
    queryFn: () => fetchContributionLedger(),
  });

  const sparkMutation = useMutation({
    mutationFn: () =>
      createQuickSparkVenture({
        domain_id: selectedDomainId !== 'all' ? selectedDomainId : null,
        title,
        problem_statement: problemStatement,
        target_user: targetUser,
        lead_human_name: currentHumanName,
        lead_ai_name: leadAi,
        initial_stage: postIntent,
        mvp_url: mvpUrl,
        repo_url: repoUrl,
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['foundry-ventures'] });
      void queryClient.invalidateQueries({ queryKey: ['foundry-skills'] });
      toast.success(`Đã đăng "${created.title}" lên Playground!`);
      setComposerExpanded(false);
      setTitle('');
      setProblemStatement('');
      setTargetUser('');
      setMvpUrl('');
      setRepoUrl('');
      navigate(`/admin/forge/${created.slug}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const upvoteMutation = useMutation({
    mutationFn: (venture: ResearchVenture) => toggleVentureUpvoteInDb(venture),
    onSuccess: (res) => {
      setLikedIds(res.likedIds);
      void queryClient.invalidateQueries({ queryKey: ['foundry-ventures'] });
      if (res.isLiked) toast.success('Đã tiếp lửa!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const joinMutation = useMutation({
    mutationFn: (ventureId: string) =>
      joinVenturePod(ventureId, currentHumanName, 'co_researcher'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['foundry-participants'] });
      toast.success('Đã tham gia nhóm nghiên cứu ý tưởng này! Bắt đầu tích lũy điểm khi hoàn thành R&D.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const leaderboard = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of ledger) {
      map.set(entry.contributor_name, (map.get(entry.contributor_name) ?? 0) + entry.points);
    }
    return Array.from(map.entries())
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [ledger]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problemStatement.trim()) {
      toast.error('Hãy viết tiêu đề và chia sẻ ngắn nội dung hoặc thành quả của bạn nhé.');
      return;
    }
    sparkMutation.mutate();
  };

  const openComposerWithIntent = (intent: VentureStage) => {
    setPostIntent(intent);
    setComposerExpanded(true);
    setTimeout(() => composerRef.current?.focus(), 60);
  };

  const topSkills = useMemo(
    () =>
      [...allSkills]
        .filter((s) => s.maturity_level !== 'gap')
        .sort((a, b) => b.reuse_count - a.reuse_count)
        .slice(0, 4),
    [allSkills]
  );

  const filteredVentures = useMemo(() => {
    if (stageFilter === 'all') return ventures;
    return ventures.filter((v) => v.stage === stageFilter);
  }, [ventures, stageFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COMMUNITY RAIL (3 cols) — Familiar Dev Social Navigation */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-20 space-y-4">
          {/* Current Dev Identity Mini-Card */}
          <div className="rounded-2xl border border-border bg-surface p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-foreground text-canvas flex items-center justify-center text-xs font-semibold shrink-0">
              {getInitials(currentHumanName)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">
                {currentHumanName}
              </div>
              <div className="text-[11px] text-muted truncate">I2FLabs Builder &amp; Researcher</div>
            </div>
          </div>

          {/* Familiar Community Feed Channels */}
          <nav className="rounded-2xl border border-border bg-surface p-2 space-y-1">
            <button
              type="button"
              onClick={() => setStageFilter('all')}
              className={cn(
                'w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                stageFilter === 'all'
                  ? 'bg-subtle text-foreground'
                  : 'text-muted hover:text-foreground hover:bg-subtle/50'
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Home className="w-4 h-4" />
                Dòng thời gian Lab
              </span>
              <span className="tabular-nums text-[11px] opacity-75">{ventures.length}</span>
            </button>

            {VENTURE_STAGE_META.map((s) => {
              const count = ventures.filter((v) => v.stage === s.stage).length;
              return (
                <button
                  key={s.stage}
                  type="button"
                  onClick={() => setStageFilter(s.stage)}
                  className={cn(
                    'w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                    stageFilter === s.stage
                      ? 'bg-subtle text-foreground'
                      : 'text-muted hover:text-foreground hover:bg-subtle/50'
                  )}
                >
                  <span className="inline-flex items-center gap-2 truncate">
                    <StageIcon stage={s.stage} className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{s.socialLabel}</span>
                  </span>
                  <span className="tabular-nums text-[11px] opacity-75">{count}</span>
                </button>
              );
            })}
          </nav>

          {/* Primary Social Action Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => openComposerWithIntent('prototype_mvp')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-canvas hover:opacity-90"
            >
              <Rocket className="w-3.5 h-3.5" />
              Chia sẻ thành quả hôm nay
            </button>
            <button
              type="button"
              onClick={() => openComposerWithIntent('vibe_spark')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground hover:bg-subtle"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Mở cuộc thảo luận ý tưởng
            </button>
          </div>
        </aside>

        {/* CENTER SOCIAL STREAM (6 cols) */}
        <section className="lg:col-span-6 space-y-4">
          {/* Natural Dev Community Status Composer */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-foreground text-canvas flex items-center justify-center text-xs font-semibold shrink-0">
                {getInitials(currentHumanName)}
              </div>

              <div className="flex-1 space-y-3">
                <input
                  ref={composerRef}
                  type="text"
                  value={title}
                  onFocus={() => setComposerExpanded(true)}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!composerExpanded) setComposerExpanded(true);
                  }}
                  placeholder={`Hôm nay ${currentHumanName} vừa build được gì hay muốn thảo luận ý tưởng nào?`}
                  className="w-full rounded-xl bg-canvas border border-border/80 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-foreground/50"
                />

                {composerExpanded && (
                  <div className="space-y-3">
                    {/* Post Intent Selector */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPostIntent('vibe_spark')}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                          postIntent === 'vibe_spark'
                            ? 'bg-foreground text-canvas border-foreground'
                            : 'bg-canvas text-muted border-border hover:text-foreground'
                        )}
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        Mở thảo luận ý tưởng
                      </button>
                      <button
                        type="button"
                        onClick={() => setPostIntent('prototype_mvp')}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                          postIntent === 'prototype_mvp'
                            ? 'bg-foreground text-canvas border-foreground'
                            : 'bg-canvas text-muted border-border hover:text-foreground'
                        )}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Chia sẻ thành quả / Demo
                      </button>
                      <button
                        type="button"
                        onClick={() => setPostIntent('deep_rdd')}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                          postIntent === 'deep_rdd'
                            ? 'bg-foreground text-canvas border-foreground'
                            : 'bg-canvas text-muted border-border hover:text-foreground'
                        )}
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        Chia sẻ kết quả thử nghiệm
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      required
                      value={problemStatement}
                      onChange={(e) => setProblemStatement(e.target.value)}
                      placeholder={
                        postIntent === 'prototype_mvp'
                          ? 'Kể nhanh bạn vừa làm được gì, điểm nào chạy ngon nhất hoặc cần anh em test giúp chỗ nào...'
                          : 'Nêu nhanh bối cảnh bài toán, giả thuyết hoặc câu hỏi muốn cả team cùng bàn luận...'
                      }
                      className="w-full rounded-xl bg-canvas border border-border/80 px-3.5 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-foreground/50"
                    />

                    {postIntent === 'prototype_mvp' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="relative">
                          <Link2 className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            value={mvpUrl}
                            onChange={(e) => setMvpUrl(e.target.value)}
                            placeholder="Link Demo / Preview (nếu có)"
                            className="w-full rounded-xl bg-canvas border border-border/80 pl-8 pr-3 py-1.5 text-xs text-foreground"
                          />
                        </div>
                        <div className="relative">
                          <GitBranch className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            placeholder="Link GitHub / PR (nếu có)"
                            className="w-full rounded-xl bg-canvas border border-border/80 pl-8 pr-3 py-1.5 text-xs text-foreground"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="relative">
                        <Users className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={targetUser}
                          onChange={(e) => setTargetUser(e.target.value)}
                          placeholder="Đối tượng hướng tới (tùy chọn)"
                          className="w-full rounded-xl bg-canvas border border-border/80 pl-8 pr-3 py-1.5 text-xs text-foreground"
                        />
                      </div>
                      <select
                        value={leadAi}
                        onChange={(e) => setLeadAi(e.target.value)}
                        className="rounded-xl bg-canvas border border-border/80 px-3 py-1.5 text-xs text-foreground"
                      >
                        <option value="">
                          {aiAgents.length > 0
                            ? 'Chọn Cộng sự AI đồng hành...'
                            : 'Chưa có Cộng sự AI trong DB'}
                        </option>
                        {aiAgents.map((a) => (
                          <option key={a.id} value={a.agent_name}>
                            AI {a.agent_name} ({a.owner_name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setComposerExpanded(false)}
                        className="rounded-full px-3 py-1.5 text-xs text-muted hover:text-foreground"
                      >
                        Đóng
                      </button>
                      <button
                        type="submit"
                        disabled={sparkMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-canvas hover:opacity-90"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Đăng lên Playground
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Mobile/Tablet Wrapping Filter Pills (Zero horizontal scrollbar) */}
          <div className="flex lg:hidden flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStageFilter('all')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                stageFilter === 'all'
                  ? 'bg-foreground text-canvas border-foreground'
                  : 'border-border bg-surface text-muted'
              )}
            >
              Tất cả ({ventures.length})
            </button>
            {VENTURE_STAGE_META.map((s) => {
              const count = ventures.filter((v) => v.stage === s.stage).length;
              return (
                <button
                  key={s.stage}
                  type="button"
                  onClick={() => setStageFilter(s.stage)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                    stageFilter === s.stage
                      ? 'bg-foreground text-canvas border-foreground'
                      : 'border-border bg-surface text-muted'
                  )}
                >
                  {s.socialLabel} ({count})
                </button>
              );
            })}
          </div>

          {/* Social Feed Stream */}
          {isLoading ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
              Đang tải bảng tin cộng đồng từ Supabase...
            </div>
          ) : filteredVentures.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center space-y-2">
              <div className="text-sm font-semibold text-foreground">
                Bảng tin đang trống — hãy mở phát súng đầu tiên!
              </div>
              <p className="text-xs text-muted max-w-md mx-auto">
                Đây là không gian hằng ngày để dev chia sẻ một demo nhỏ vừa chạy được hoặc mở cuộc thảo luận về một ý tưởng mới.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVentures.map((v) => {
                const stageMeta =
                  VENTURE_STAGE_META.find((m) => m.stage === v.stage) ?? VENTURE_STAGE_META[0];
                const vSkills = allSkills.filter((s) => s.venture_id === v.id);
                const readySkills = vSkills.filter((s) => s.maturity_level !== 'gap');
                const gapSkills = vSkills.filter((s) => s.maturity_level === 'gap');
                const openFeedbackCount = allTelemetry.filter(
                  (t) => t.venture_id === v.id && t.status === 'open'
                ).length;
                const vParticipants = participants.filter((p) => p.venture_id === v.id);
                const hasJoined = vParticipants.some(
                  (p) => p.participant_name.toLowerCase() === currentHumanName.toLowerCase()
                );
                const vPoints = ledger
                  .filter((l) => l.venture_id === v.id)
                  .reduce((sum, l) => sum + l.points, 0);
                const upvoteCount = v.upvotes_count ?? 0;
                const isLiked = likedIds.includes(v.id);

                return (
                  <article
                    key={v.id}
                    className="rounded-2xl border border-border bg-surface p-5 space-y-3.5 hover:border-foreground/30 transition-colors"
                  >
                    {/* Author Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-subtle border border-border flex items-center justify-center text-xs font-semibold text-foreground">
                            {getInitials(v.lead_human_name)}
                          </div>
                          {v.lead_ai_name && v.lead_ai_name !== 'AI Twin' && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-foreground text-canvas border-2 border-surface flex items-center justify-center text-[9px] font-bold">
                              {v.lead_ai_name.slice(0, 1)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-semibold text-foreground">
                              {v.lead_human_name}
                            </span>
                            {v.lead_ai_name && v.lead_ai_name !== 'AI Twin' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 text-[11px] font-medium text-foreground">
                                <Bot className="w-3 h-3 text-emerald-500" />
                                {v.lead_ai_name}
                              </span>
                            )}
                            <span className="text-muted">· Vòng #{v.cycle_number}</span>
                          </div>
                          {v.target_user && (
                            <p className="text-[11px] text-muted truncate mt-0.5">
                              Dành cho: {v.target_user}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                            v.evaluation_status === 'approved_for_dev'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                              : v.evaluation_status === 'revision_needed'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                                : 'bg-subtle text-muted border-border'
                          )}
                        >
                          {v.evaluation_status === 'approved_for_dev' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {v.evaluation_status === 'approved_for_dev'
                            ? `Server duyệt · ${Number(v.evaluation_score ?? 0).toFixed(0)}đ`
                            : v.evaluation_status === 'revision_needed'
                              ? `Cần chỉnh sửa · ${Number(v.evaluation_score ?? 0).toFixed(0)}đ`
                              : 'Chờ thẩm định'}
                        </span>

                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                            stageMeta.badgeClass
                          )}
                        >
                          <StageIcon stage={v.stage} className="w-3 h-3" />
                          {stageMeta.socialLabel}
                        </span>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="space-y-1.5">
                      <Link
                        to={`/admin/forge/${v.slug}`}
                        className="block text-base sm:text-lg font-semibold text-foreground hover:underline leading-snug"
                      >
                        {v.title}
                      </Link>
                      <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
                        {v.problem_statement}
                      </p>
                    </div>

                    {/* Inline Demo / Repo / Live Metrics Strip */}
                    {(v.mvp_url || v.repo_url || v.unikorn_metrics.active_users > 0 || readySkills.length > 0) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {v.mvp_url && (
                          <a
                            href={v.mvp_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-canvas px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-subtle"
                          >
                            <Link2 className="w-3 h-3" />
                            Demo Live
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {v.repo_url && (
                          <a
                            href={v.repo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-canvas px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-subtle"
                          >
                            <GitBranch className="w-3 h-3" />
                            Repo
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {v.unikorn_metrics.active_users > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-medium">
                            <Users className="w-3 h-3" />
                            {v.unikorn_metrics.active_users} users
                          </span>
                        )}
                        {readySkills.slice(0, 2).map((sk) => (
                          <span
                            key={sk.id}
                            className="inline-flex items-center gap-1 rounded-full bg-subtle px-2.5 py-1 text-[11px] text-foreground"
                          >
                            <CompetencyAxisIcon axis={sk.competency_axis} className="w-3 h-3 text-muted" />
                            <span className="truncate max-w-[160px]">{sk.title}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Social Interaction Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/70">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={upvoteMutation.isPending}
                          onClick={() => upvoteMutation.mutate(v)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                            isLiked
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                              : 'bg-canvas border-border text-muted hover:text-foreground'
                          )}
                        >
                          <Flame className={cn('w-3.5 h-3.5', isLiked && 'text-amber-500')} />
                          <span>Tiếp lửa</span>
                          <span className="tabular-nums font-semibold">{upvoteCount}</span>
                        </button>

                        <Link
                          to={`/admin/forge/${v.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-3 py-1 text-xs font-medium text-muted hover:text-foreground"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Thảo luận</span>
                          {openFeedbackCount > 0 && (
                            <span className="rounded-full bg-purple-500/15 text-purple-600 px-1.5 text-[10px] font-semibold">
                              {openFeedbackCount}
                            </span>
                          )}
                        </Link>

                        {gapSkills.length > 0 && (
                          <Link
                            to={`/admin/forge/${v.slug}`}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-canvas px-3 py-1 text-xs font-medium text-muted hover:text-foreground"
                          >
                            <HandHelping className="w-3.5 h-3.5" />
                            <span>Góp sức</span>
                          </Link>
                        )}

                        {!hasJoined ? (
                          <button
                            type="button"
                            disabled={joinMutation.isPending}
                            onClick={() => joinMutation.mutate(v.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-canvas px-3 py-1 text-xs font-medium text-foreground hover:bg-subtle"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Tham gia ({vParticipants.length})</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 py-1 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đã tham gia ({vParticipants.length})</span>
                          </span>
                        )}

                        {vPoints > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            {vPoints} điểm R&amp;D
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/admin/forge/${v.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
                      >
                        Mở luồng thảo luận
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT DISCOVERY RAIL (3 cols) */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-20 space-y-4">
          {/* Contributor Points Leaderboard from DB */}
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Điểm đóng góp R&amp;D
              </h2>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-xs text-muted">
                Chưa có điểm nào được ghi nhận. Thẩm định hoặc hoàn thành bước R&amp;D để nhận điểm.
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((row, idx) => (
                  <div key={row.name} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground truncate">
                      {idx + 1}. {row.name}
                    </span>
                    <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
                      {row.points} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active AI Buddies from DB */}
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Cộng sự AI sẵn sàng
              </h2>
              <Link to="/admin/researchers" className="text-[11px] text-muted hover:text-foreground">
                Cấu hình →
              </Link>
            </div>
            {aiAgents.length === 0 ? (
              <p className="text-xs text-muted">
                Chưa có AI Agent trong DB. Thêm tại{' '}
                <Link to="/admin/researchers" className="underline text-foreground">
                  Đội ngũ &amp; AI
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-2">
                {aiAgents.slice(0, 5).map((ai) => (
                  <div key={ai.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-medium text-foreground truncate">{ai.agent_name}</span>
                    </div>
                    <span className="text-[11px] text-muted truncate">{ai.owner_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Distilled Team Skills */}
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Bí kíp Kỹ năng mới
              </h2>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            {topSkills.length === 0 ? (
              <p className="text-xs text-muted">Chưa có kỹ năng nào được đúc kết từ dự án.</p>
            ) : (
              <div className="space-y-2">
                {topSkills.map((sk) => {
                  const parentVenture = ventures.find((v) => v.id === sk.venture_id);
                  return (
                    <Link
                      key={sk.id}
                      to={parentVenture ? `/admin/forge/${parentVenture.slug}` : '/admin/forge'}
                      className="block rounded-xl border border-border/70 bg-canvas p-2.5 space-y-1 hover:border-foreground/40 transition-colors"
                    >
                      <div className="inline-flex items-center gap-1 text-[10px] font-medium text-muted">
                        <CompetencyAxisIcon axis={sk.competency_axis} className="w-3 h-3" />
                        <span>{COMPETENCY_AXIS_LABELS[sk.competency_axis]}</span>
                      </div>
                      <div className="text-xs font-semibold text-foreground line-clamp-1">
                        {sk.title}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
