import { useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Bot,
  Bug,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Compass,
  ExternalLink,
  FilePlus2,
  Flame,
  FlaskConical,
  Gauge,
  HandHelping,
  MessageCircle,
  MessageSquarePlus,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDomains } from '@/context/DomainContext';
import { useAuth } from '@/context/AuthContext';
import {
  COMPETENCY_AXIS_LABELS,
  FRIENDLY_NODE_LABELS,
  VENTURE_STAGE_META,
  computeElasticHabitStreak,
  convertTelemetryToReturnSpark,
  createProblemSkill,
  fetchContributionLedger,
  fetchProblemSkills,
  fetchRdHabitLogs,
  fetchVentureBySlug,
  fetchVentureEvaluations,
  fetchVentureParticipants,
  fetchVentureTelemetry,
  getMyUpvotedVentureIds,
  injectSkillToAiAgent,
  joinVenturePod,
  logRdHabit,
  promoteVentureStage,
  recordTelemetryEvent,
  spawnSkillGapBounty,
  submitHumanEvaluation,
  toggleVentureRddItem,
  toggleVentureUpvoteInDb,
  triggerServerAiEvaluation,
  updateVenture,
} from '@/features/foundry/api';
import {
  CompetencyAxisIcon,
  NodeTypeIcon,
} from '@/features/foundry/foundryIcons';
import {
  createResearchTask,
  fetchResearchTasks,
  fetchResearcherAiAgents,
} from '@/features/workspace/api';
import { cn, slugify } from '@/lib/utils';
import type {
  CompetencyAxis,
  EvaluationVerdict,
  TelemetryEventType,
  TelemetrySeverity,
  VentureParticipant,
  VentureRddItem,
  VentureStage,
} from '@/types/database';

type ComposerMode = 'progress' | 'question' | 'feedback' | 'skill';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function FoundryCockpitPage() {
  const { slug } = useParams<{ slug: string }>();
  const { selectedDomainId } = useDomains();
  const { adminProfile, user } = useAuth();
  const queryClient = useQueryClient();

  const currentHumanName =
    adminProfile?.display_name || user?.email?.split('@')[0] || 'Researcher';

  const [composerMode, setComposerMode] = useState<ComposerMode>('progress');
  const [likedIds, setLikedIds] = useState<string[]>(() => getMyUpvotedVentureIds());

  // Progress / Question / Feedback fields
  const [progressNote, setProgressNote] = useState('');
  const [rddTitle, setRddTitle] = useState('');
  const [rddType, setRddType] = useState<VentureRddItem['node_type']>('empirical_poc');
  const [rddPersona, setRddPersona] = useState('');
  const [telTitle, setTelTitle] = useState('');
  const [telType, setTelType] = useState<TelemetryEventType>('friction');
  const [telSeverity, setTelSeverity] = useState<TelemetrySeverity>('high');
  const [telDelta, setTelDelta] = useState('');

  // Skill distillation fields
  const [skillTitle, setSkillTitle] = useState('');
  const [skillAxis, setSkillAxis] = useState<CompetencyAxis>('systems');
  const [skillPrinciples, setSkillPrinciples] = useState('');
  const [skillEvidence, setSkillEvidence] = useState('');

  // Inline MVP URLs editor
  const [editingUrls, setEditingUrls] = useState(false);
  const [mvpUrlInput, setMvpUrlInput] = useState('');
  const [repoUrlInput, setRepoUrlInput] = useState('');

  // Server Idea Evaluation & Member Review state
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewAgentId, setReviewAgentId] = useState('');
  const [verdict, setVerdict] = useState<EvaluationVerdict>('approve');
  const [marketPainScore, setMarketPainScore] = useState(80);
  const [feasibilityScore, setFeasibilityScore] = useState(78);
  const [productViabilityScore, setProductViabilityScore] = useState(82);
  const [noveltyScore, setNoveltyScore] = useState(75);
  const [reviewNote, setReviewNote] = useState('');
  const [joinRole, setJoinRole] = useState<VentureParticipant['role_in_venture']>('co_researcher');

  const { data: venture, isLoading } = useQuery({
    queryKey: ['foundry-venture', slug],
    queryFn: () => fetchVentureBySlug(slug ?? ''),
    enabled: Boolean(slug),
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['foundry-skills', venture?.id],
    queryFn: () => fetchProblemSkills(venture!.id),
    enabled: Boolean(venture?.id),
  });

  const { data: telemetry = [] } = useQuery({
    queryKey: ['foundry-telemetry', venture?.id],
    queryFn: () => fetchVentureTelemetry(venture!.id),
    enabled: Boolean(venture?.id),
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['foundry-habits', venture?.id],
    queryFn: () => fetchRdHabitLogs(venture!.id),
    enabled: Boolean(venture?.id),
  });

  const { data: aiAgents = [] } = useQuery({
    queryKey: ['ws-ai-agents', selectedDomainId],
    queryFn: () => fetchResearcherAiAgents(selectedDomainId),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['ws-tasks', selectedDomainId],
    queryFn: () => fetchResearchTasks(selectedDomainId),
  });

  const { data: evaluations = [] } = useQuery({
    queryKey: ['foundry-evaluations', venture?.id],
    queryFn: () => fetchVentureEvaluations(venture!.id),
    enabled: Boolean(venture?.id),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['foundry-participants', venture?.id],
    queryFn: () => fetchVentureParticipants(venture!.id),
    enabled: Boolean(venture?.id),
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ['foundry-ledger', venture?.id],
    queryFn: () => fetchContributionLedger(venture!.id),
    enabled: Boolean(venture?.id),
  });

  const contributorTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of participants) {
      map.set(p.participant_name, map.get(p.participant_name) ?? 0);
    }
    for (const entry of ledger) {
      map.set(entry.contributor_name, (map.get(entry.contributor_name) ?? 0) + entry.points);
    }
    return Array.from(map.entries())
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points);
  }, [participants, ledger]);

  const latestCoachingPlan = useMemo(
    () => evaluations.find((e) => e.ai_coaching_plan)?.ai_coaching_plan ?? null,
    [evaluations]
  );

  const hasJoinedCurrentUser = useMemo(
    () =>
      participants.some(
        (p) => p.participant_name.toLowerCase() === currentHumanName.toLowerCase()
      ),
    [participants, currentHumanName]
  );

  const verifiedSkillsCount = useMemo(
    () =>
      skills.filter(
        (s) => s.maturity_level === 'verified' || s.maturity_level === 'automated_in_ai'
      ).length,
    [skills]
  );

  const hasVerifiedFmea = useMemo(
    () =>
      Boolean(
        venture?.rdd_nodes.some((n) => n.node_type === 'failure_mode' && n.status === 'verified')
      ),
    [venture]
  );

  const streak = useMemo(() => computeElasticHabitStreak(habitLogs), [habitLogs]);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['foundry-venture', slug] });
    void queryClient.invalidateQueries({ queryKey: ['foundry-ventures'] });
    void queryClient.invalidateQueries({ queryKey: ['foundry-skills'] });
    void queryClient.invalidateQueries({ queryKey: ['foundry-telemetry'] });
    void queryClient.invalidateQueries({ queryKey: ['foundry-habits'] });
    void queryClient.invalidateQueries({ queryKey: ['foundry-evaluations'] });
    void queryClient.invalidateQueries({ queryKey: ['foundry-participants'] });
    void queryClient.invalidateQueries({ queryKey: ['foundry-ledger'] });
    void queryClient.invalidateQueries({ queryKey: ['ws-tasks'] });
  };

  const promoteStageMutation = useMutation({
    mutationFn: (nextStage: VentureStage) =>
      promoteVentureStage(venture!, nextStage, verifiedSkillsCount, currentHumanName),
    onSuccess: (updated) => {
      invalidateAll();
      const label =
        VENTURE_STAGE_META.find((m) => m.stage === updated.stage)?.socialLabel ?? updated.stage;
      toast.success(`Dự án đã chuyển sang: ${label}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleRddMutation = useMutation({
    mutationFn: (rddId: string) => toggleVentureRddItem(venture!, rddId, currentHumanName),
    onSuccess: () => {
      invalidateAll();
      toast.success('Đã cập nhật trạng thái bước nghiên cứu & cộng điểm R&D!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const serverAiReviewMutation = useMutation({
    mutationFn: () => triggerServerAiEvaluation(venture!.id, reviewAgentId || null),
    onSuccess: (ev) => {
      invalidateAll();
      toast.success(
        `AI Server (${ev.evaluator_name}) đã chấm ${Number(ev.overall_score).toFixed(0)}/100!`
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submitReviewMutation = useMutation({
    mutationFn: () =>
      submitHumanEvaluation({
        venture_id: venture!.id,
        evaluator_name: currentHumanName,
        verdict,
        market_pain_score: marketPainScore,
        feasibility_score: feasibilityScore,
        product_viability_score: productViabilityScore,
        novelty_score: noveltyScore,
        review_note: reviewNote,
      }),
    onSuccess: () => {
      setIsReviewing(false);
      setReviewNote('');
      invalidateAll();
      toast.success('Đã gửi đánh giá lên Server (+15 điểm đóng góp)!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const joinPodMutation = useMutation({
    mutationFn: () => joinVenturePod(venture!.id, currentHumanName, joinRole),
    onSuccess: () => {
      invalidateAll();
      toast.success('Đã tham gia ý tưởng! Hoàn thành các giai đoạn R&D để tích điểm.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const postProgressMutation = useMutation({
    mutationFn: () =>
      logRdHabit({
        venture_id: venture!.id,
        actor_name: currentHumanName,
        actor_type: 'human',
        ritual_type: 'poc_shipped',
        note: progressNote.trim(),
        duration_minutes: 15,
        logged_date: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => {
      setProgressNote('');
      invalidateAll();
      toast.success('Đã đăng cập nhật lên dòng chảy dự án (+15p Habit Streak)!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addRddMutation = useMutation({
    mutationFn: async () => {
      await updateVenture(venture!.id, {
        rdd_nodes: [
          ...venture!.rdd_nodes,
          {
            id: `rdd-${Date.now()}`,
            node_type: rddType,
            title: rddTitle.trim(),
            persona: rddPersona,
            status: 'pending',
          },
        ],
      });
      await logRdHabit({
        venture_id: venture!.id,
        actor_name: currentHumanName,
        actor_type: 'human',
        ritual_type: 'rdd_branched',
        note: `Đặt nhánh nghiên cứu mới: "${rddTitle.trim()}" cùng AI ${rddPersona}.`,
        duration_minutes: 15,
        logged_date: new Date().toISOString().slice(0, 10),
      });
    },
    onSuccess: () => {
      setRddTitle('');
      invalidateAll();
      toast.success('Đã thêm câu hỏi / thử nghiệm mới vào luồng nghiên cứu!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const distillSkillMutation = useMutation({
    mutationFn: async () => {
      const created = await createProblemSkill({
        venture_id: venture!.id,
        domain_id: venture!.domain_id,
        skill_key: slugify(skillTitle) || `skill_${Date.now()}`,
        title: skillTitle.trim(),
        description: skillPrinciples.trim() || null,
        competency_axis: skillAxis,
        maturity_level: skillEvidence.trim() ? 'verified' : 'learning',
        first_principles: skillPrinciples.trim() || null,
        procedure: null,
        verification_criteria: skillEvidence.trim() || 'Đã áp dụng thực tế trong dự án',
        evidence_url: skillEvidence.trim() || null,
        aevum_skill_id: null,
        owner_human_name: currentHumanName,
        injected_ai_agent_id: null,
        injected_ai_name: null,
        reuse_count: 1,
      });
      await logRdHabit({
        venture_id: venture!.id,
        actor_name: currentHumanName,
        actor_type: 'human',
        ritual_type: 'skill_distilled',
        note: `Lưu bí kíp mới "${created.title}" vào kho kỹ năng của bài toán.`,
        duration_minutes: 15,
        logged_date: new Date().toISOString().slice(0, 10),
      });
      return created;
    },
    onSuccess: (created) => {
      setSkillTitle('');
      setSkillPrinciples('');
      setSkillEvidence('');
      invalidateAll();
      toast.success(`Đã lưu bí kíp "${created.title}"! Bạn có thể dạy ngay cho AI Buddy.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const injectAiMutation = useMutation({
    mutationFn: ({ skill, agentId, agentName }: { skill: any; agentId: string; agentName: string }) =>
      injectSkillToAiAgent(skill, agentId, agentName),
    onSuccess: (updated) => {
      invalidateAll();
      toast.success(`AI ${updated.injected_ai_name} đã học xong bí kíp "${updated.title}"!`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addTelemetryMutation = useMutation({
    mutationFn: () =>
      recordTelemetryEvent({
        venture_id: venture!.id,
        event_type: telType,
        severity: telSeverity,
        title: telTitle.trim(),
        detail: `Chia sẻ bởi ${currentHumanName}`,
        metric_delta: telDelta.trim() || null,
        status: 'open',
        converted_task_id: null,
      }),
    onSuccess: () => {
      setTelTitle('');
      setTelDelta('');
      invalidateAll();
      toast.success('Đã ghi nhận phản hồi thực tế từ người dùng!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const convertSparkMutation = useMutation({
    mutationFn: (eventId: string) => {
      const target = telemetry.find((e) => e.id === eventId)!;
      return convertTelemetryToReturnSpark(venture!, target);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Đã biến phản hồi user thành nhiệm vụ cải tiến vòng V2!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveUrlsMutation = useMutation({
    mutationFn: () =>
      updateVenture(venture!.id, {
        mvp_url: mvpUrlInput.trim() || null,
        repo_url: repoUrlInput.trim() || null,
      }),
    onSuccess: () => {
      setEditingUrls(false);
      invalidateAll();
      toast.success('Đã cập nhật link dùng thử & GitHub!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const spawnNodeBounty = async (node: VentureRddItem) => {
    try {
      await createResearchTask({
        domain_id: venture!.domain_id,
        topic_id: venture!.topic_id,
        title: `[Nhờ đồng đội] ${node.title}`,
        description: `Nhiệm vụ tách từ phòng dự án "${venture!.title}" (Vòng #${venture!.cycle_number}).`,
        task_type:
          node.node_type === 'formal_proof'
            ? 'formal_proof'
            : node.node_type === 'empirical_poc'
              ? 'empirical_poc'
              : node.node_type === 'benchmark'
                ? 'benchmark'
                : node.node_type === 'failure_mode'
                  ? 'fmea_audit'
                  : 'vibe_spark',
        status: 'backlog',
        priority: 'high',
        assignee_human_name: 'Open Bounty',
        assignee_ai_name: node.persona,
        assignee_ai_id: null,
        is_bounty: true,
        due_date: null,
      });
      invalidateAll();
      toast.success('Đã đăng lời kêu gọi giúp đỡ lên Kanban Board!');
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo lời kêu gọi');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-sm text-muted">
        Đang mở phòng dự án...
      </div>
    );
  }

  if (!venture) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <p className="text-sm text-muted">Không tìm thấy dự án "{slug}".</p>
        <Link to="/admin/forge" className="text-xs font-medium text-foreground underline">
          ← Quay lại Bảng Tin Foundry
        </Link>
      </div>
    );
  }

  const currentStageMeta =
    VENTURE_STAGE_META.find((s) => s.stage === venture.stage) ?? VENTURE_STAGE_META[0];
  const currentStageIndex = VENTURE_STAGE_META.findIndex((s) => s.stage === venture.stage);
  const nextStageMeta =
    currentStageIndex < VENTURE_STAGE_META.length - 1
      ? VENTURE_STAGE_META[currentStageIndex + 1]
      : VENTURE_STAGE_META[1];

  const relatedTasks = tasks.filter(
    (t) =>
      (venture.topic_id && t.topic_id === venture.topic_id) ||
      t.title.toLowerCase().includes(venture.title.split('—')[0].trim().toLowerCase())
  );

  const injectedAgents = Array.from(
    new Map(
      skills
        .filter((s) => s.injected_ai_name)
        .map((s) => [s.injected_ai_name!, s.injected_ai_name!])
    ).values()
  );

  const upvoteCount = venture.upvotes_count ?? 0;
  const isLiked = likedIds.includes(venture.id);

  const upvoteMutation = useMutation({
    mutationFn: () => toggleVentureUpvoteInDb(venture),
    onSuccess: (res) => {
      setLikedIds(res.likedIds);
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleComposerSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (composerMode === 'progress') {
      if (!progressNote.trim()) return;
      postProgressMutation.mutate();
    } else if (composerMode === 'question') {
      if (!rddTitle.trim()) return;
      addRddMutation.mutate();
    } else if (composerMode === 'feedback') {
      if (!telTitle.trim()) return;
      addTelemetryMutation.mutate();
    } else if (composerMode === 'skill') {
      if (!skillTitle.trim()) return;
      distillSkillMutation.mutate();
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb + Social Story Header */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/admin/forge"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại Bảng Tin Foundry
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={upvoteMutation.isPending}
              onClick={() => upvoteMutation.mutate()}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors',
                isLiked
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                  : 'bg-canvas border-border text-muted hover:text-foreground'
              )}
            >
              <Flame className={cn('w-3.5 h-3.5', isLiked && 'text-amber-500')} />
              <span>Tiếp lửa ({upvoteCount})</span>
            </button>

            <button
              type="button"
              disabled={promoteStageMutation.isPending}
              onClick={() => promoteStageMutation.mutate(nextStageMeta.stage)}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-canvas hover:opacity-90"
            >
              {venture.stage === 'research_loop' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Đào sâu Vòng #{venture.cycle_number + 1}
                </>
              ) : (
                <>
                  <Rocket className="w-3.5 h-3.5" />
                  Lên bước: {nextStageMeta.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Paired Authors + Story Title */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0 hidden sm:block">
            <div className="w-12 h-12 rounded-full bg-subtle border border-border flex items-center justify-center text-sm font-semibold text-foreground">
              {getInitials(venture.lead_human_name)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-foreground text-canvas border-2 border-surface flex items-center justify-center text-[10px] font-bold">
              {venture.lead_ai_name.slice(0, 1)}
            </div>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                  currentStageMeta.badgeClass
                )}
              >
                {currentStageMeta.socialLabel}
              </span>
              <span className="rounded-full bg-subtle px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                Vòng #{venture.cycle_number}
              </span>
              <span className="text-xs text-muted">
                Dẫn dắt bởi <strong className="text-foreground">{venture.lead_human_name}</strong> + AI{' '}
                <strong className="text-foreground">{venture.lead_ai_name}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              {venture.title}
            </h1>
            <p className="text-sm text-muted leading-relaxed">{venture.problem_statement}</p>
          </div>
        </div>

        {/* Friendly 5-Step Progress Journey */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {VENTURE_STAGE_META.map((s) => {
            const isCurrent = s.stage === venture.stage;
            const isPassed = s.step < currentStageMeta.step;
            return (
              <div
                key={s.stage}
                className={cn(
                  'rounded-xl border px-3 py-2.5 transition-colors',
                  isCurrent
                    ? 'border-foreground bg-foreground text-canvas'
                    : isPassed
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
                      : 'border-border bg-canvas text-muted'
                )}
              >
                <div className="text-xs font-semibold truncate">{s.label}</div>
                <div
                  className={cn(
                    'text-[11px] mt-0.5 truncate',
                    isCurrent ? 'text-canvas/80' : 'text-muted'
                  )}
                >
                  {s.shortDesc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Thread & Context Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Server Evaluation Gate + Co-Building Social Composer + Milestones */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card L0: Server-Side Idea Evaluation, Approval Gate & AI Research-to-Market Coach */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Thẩm định &amp; Chấm điểm trên Server (Gate Phát triển Sản phẩm)
                  </h2>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[11px] font-semibold border',
                      venture.evaluation_status === 'approved_for_dev'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                        : venture.evaluation_status === 'revision_needed'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                          : 'bg-canvas text-muted border-border'
                    )}
                  >
                    {venture.evaluation_status === 'approved_for_dev'
                      ? 'Đã duyệt phát triển'
                      : venture.evaluation_status === 'revision_needed'
                        ? 'Cần chỉnh sửa thêm'
                        : 'Đang chờ thẩm định'}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Điểm Server: <strong className="text-foreground">{Number(venture.evaluation_score ?? 0).toFixed(1)}/100</strong> · Thành viên duyệt: <strong className="text-foreground">{venture.human_approvals ?? 0}</strong> · AI Agent duyệt: <strong className="text-foreground">{venture.ai_approvals ?? 0}</strong> (Cần ≥ 70đ + ≥ 1 Human + ≥ 1 AI)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {aiAgents.length > 0 && (
                  <select
                    value={reviewAgentId}
                    onChange={(e) => setReviewAgentId(e.target.value)}
                    className="rounded-full border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="">AI Server mặc định</option>
                    {aiAgents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.agent_name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  disabled={serverAiReviewMutation.isPending}
                  onClick={() => serverAiReviewMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-canvas hover:opacity-90"
                >
                  <Bot className="w-3.5 h-3.5" />
                  AI Server Chấm điểm
                </button>

                <button
                  type="button"
                  onClick={() => setIsReviewing((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-subtle"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Thành viên Chấm điểm
                </button>
              </div>
            </div>

            {/* Member 4-Criteria Scoring Form */}
            {isReviewing && (
              <div className="rounded-xl border border-border bg-canvas p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted">Giá trị thị trường &amp; Nỗi đau (30%)</span>
                      <strong className="text-foreground tabular-nums">{marketPainScore}</strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={marketPainScore}
                      onChange={(e) => setMarketPainScore(Number(e.target.value))}
                      className="w-full"
                    />
                  </label>
                  <label className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted">Tính khả thi Nghiên cứu (25%)</span>
                      <strong className="text-foreground tabular-nums">{feasibilityScore}</strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={feasibilityScore}
                      onChange={(e) => setFeasibilityScore(Number(e.target.value))}
                      className="w-full"
                    />
                  </label>
                  <label className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted">Khả năng thành Sản phẩm MVP (30%)</span>
                      <strong className="text-foreground tabular-nums">{productViabilityScore}</strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={productViabilityScore}
                      onChange={(e) => setProductViabilityScore(Number(e.target.value))}
                      className="w-full"
                    />
                  </label>
                  <label className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted">Tính mới &amp; Lợi thế tri thức (15%)</span>
                      <strong className="text-foreground tabular-nums">{noveltyScore}</strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={noveltyScore}
                      onChange={(e) => setNoveltyScore(Number(e.target.value))}
                      className="w-full"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={verdict}
                    onChange={(e) => setVerdict(e.target.value as EvaluationVerdict)}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="approve">Duyệt bắt đầu phát triển</option>
                    <option value="needs_revision">Cần bổ sung thêm</option>
                    <option value="reject">Chưa khả thi</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Nhận xét về thị trường, hướng sản phẩm hoặc góp ý..."
                    className="sm:col-span-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewing(false)}
                    className="rounded-full px-3 py-1 text-xs text-muted hover:text-foreground"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={submitReviewMutation.isPending || !reviewNote.trim()}
                    onClick={() => submitReviewMutation.mutate()}
                    className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-canvas disabled:opacity-50"
                  >
                    Gửi đánh giá (+15 điểm)
                  </button>
                </div>
              </div>
            )}

            {/* AI Coaching Plan: Research -> Product -> Market */}
            {latestCoachingPlan && (
              <div className="rounded-xl border border-border/80 bg-canvas p-4 space-y-2.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Compass className="w-3.5 h-3.5 text-sky-500" />
                  Lộ trình AI dẫn đường: Từ Nghiên cứu đến Sản phẩm &amp; Thị trường
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-lg bg-surface border border-border/70 p-2.5">
                    <div className="font-semibold text-foreground">1. Xác thực Thị trường</div>
                    <p className="text-muted mt-0.5">{latestCoachingPlan.market_validation}</p>
                  </div>
                  <div className="rounded-lg bg-surface border border-border/70 p-2.5">
                    <div className="font-semibold text-foreground">2. Trọng tâm Nghiên cứu</div>
                    <p className="text-muted mt-0.5">{latestCoachingPlan.research_focus}</p>
                  </div>
                  <div className="rounded-lg bg-surface border border-border/70 p-2.5">
                    <div className="font-semibold text-foreground">3. Phạm vi MVP Lõi</div>
                    <p className="text-muted mt-0.5">{latestCoachingPlan.mvp_scope}</p>
                  </div>
                  <div className="rounded-lg bg-surface border border-border/70 p-2.5">
                    <div className="font-semibold text-foreground">4. Đưa ra Thị trường (Unikorn)</div>
                    <p className="text-muted mt-0.5">{latestCoachingPlan.go_to_market}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Evaluation History Feed */}
            {evaluations.length > 0 && (
              <div className="space-y-2 pt-1">
                {evaluations.slice(0, 4).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border/70 bg-canvas px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {ev.evaluator_type === 'ai_agent' ? (
                          <Bot className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Users className="w-3.5 h-3.5 text-foreground shrink-0" />
                        )}
                        <strong className="text-foreground">{ev.evaluator_name}</strong>
                        <span className="text-muted">· {Number(ev.overall_score).toFixed(0)}/100</span>
                      </div>
                      <p className="text-muted mt-0.5">{ev.review_note}</p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0',
                        ev.verdict === 'approve'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                      )}
                    >
                      {ev.verdict === 'approve' ? 'Duyệt' : 'Cần sửa'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* In-Room Multi-Mode Social Composer */}
          <form
            onSubmit={handleComposerSubmit}
            className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setComposerMode('progress')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  composerMode === 'progress'
                    ? 'bg-foreground text-canvas'
                    : 'bg-canvas text-muted hover:text-foreground border border-border'
                )}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Chia sẻ tiến độ (15p)
              </button>
              <button
                type="button"
                onClick={() => setComposerMode('question')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  composerMode === 'question'
                    ? 'bg-foreground text-canvas'
                    : 'bg-canvas text-muted hover:text-foreground border border-border'
                )}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                Thêm câu hỏi / Thử nghiệm
              </button>
              <button
                type="button"
                onClick={() => setComposerMode('feedback')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  composerMode === 'feedback'
                    ? 'bg-foreground text-canvas'
                    : 'bg-canvas text-muted hover:text-foreground border border-border'
                )}
              >
                <Bug className="w-3.5 h-3.5" />
                Ghi nhận phản hồi User
              </button>
              <button
                type="button"
                onClick={() => setComposerMode('skill')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  composerMode === 'skill'
                    ? 'bg-foreground text-canvas'
                    : 'bg-canvas text-muted hover:text-foreground border border-border'
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                Lưu bí kíp kỹ năng
              </button>
            </div>

            {composerMode === 'progress' && (
              <div className="space-y-2.5">
                <textarea
                  rows={2}
                  required
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder={`Hôm nay ${currentHumanName} vừa khám phá, sửa lỗi hay chạy thử được gì cho bài toán này?`}
                  className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2 text-sm text-foreground"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    Chuỗi hiện tại: <strong className="text-foreground">{streak.activeDaysLast7}/7 ngày</strong>
                  </span>
                  <button
                    type="submit"
                    disabled={postProgressMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-canvas hover:opacity-90"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    Đăng cập nhật
                  </button>
                </div>
              </div>
            )}

            {composerMode === 'question' && (
              <div className="space-y-2.5">
                <input
                  type="text"
                  required
                  value={rddTitle}
                  onChange={(e) => setRddTitle(e.target.value)}
                  placeholder="Nhập câu hỏi, giả thuyết hoặc bài test bạn muốn cả nhóm cùng kiểm chứng..."
                  className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2 text-sm text-foreground"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={rddType}
                      onChange={(e) => setRddType(e.target.value as VentureRddItem['node_type'])}
                      className="rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground"
                    >
                      {Object.entries(FRIENDLY_NODE_LABELS).map(([k, info]) => (
                        <option key={k} value={k}>
                          {info.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={rddPersona}
                      onChange={(e) => setRddPersona(e.target.value)}
                      className="rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground"
                    >
                      <option value="">
                        {aiAgents.length > 0 ? 'Chọn AI đồng hành...' : 'Chưa có AI (DB)'}
                      </option>
                      {aiAgents.map((a) => (
                        <option key={a.id} value={a.agent_name}>
                          {a.agent_name} ({a.owner_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={addRddMutation.isPending}
                    className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-canvas"
                  >
                    Đăng lên luồng nghiên cứu
                  </button>
                </div>
              </div>
            )}

            {composerMode === 'feedback' && (
              <div className="space-y-2.5">
                <input
                  type="text"
                  required
                  value={telTitle}
                  onChange={(e) => setTelTitle(e.target.value)}
                  placeholder="Người dùng thật đang gặp vướng mắc gì hoặc muốn thêm tính năng gì?"
                  className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2 text-sm text-foreground"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={telType}
                      onChange={(e) => setTelType(e.target.value as TelemetryEventType)}
                      className="rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground"
                    >
                      <option value="friction">User gặp vướng mắc</option>
                      <option value="feature_pull">User đề xuất thêm</option>
                      <option value="crash">Lỗi / Crash thực tế</option>
                      <option value="benchmark_drift">Chậm / Tụt độ chuẩn</option>
                    </select>
                    <select
                      value={telSeverity}
                      onChange={(e) => setTelSeverity(e.target.value as TelemetrySeverity)}
                      className="rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground"
                    >
                      <option value="high">Ưu tiên: Cao</option>
                      <option value="medium">Ưu tiên: Vừa</option>
                      <option value="critical">Ưu tiên: Khẩn cấp</option>
                      <option value="low">Ưu tiên: Thấp</option>
                    </select>
                    <input
                      type="text"
                      value={telDelta}
                      onChange={(e) => setTelDelta(e.target.value)}
                      placeholder="Số liệu (VD: 3 user báo lỗi)"
                      className="rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground w-40"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={addTelemetryMutation.isPending}
                    className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-canvas"
                  >
                    Ghi nhận phản hồi
                  </button>
                </div>
              </div>
            )}

            {composerMode === 'skill' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={skillTitle}
                    onChange={(e) => setSkillTitle(e.target.value)}
                    placeholder="Tên bí kíp kỹ năng vừa rút ra được..."
                    className="rounded-xl border border-border bg-canvas px-3 py-2 text-xs text-foreground"
                  />
                  <select
                    value={skillAxis}
                    onChange={(e) => setSkillAxis(e.target.value as CompetencyAxis)}
                    className="rounded-xl border border-border bg-canvas px-3 py-2 text-xs text-foreground"
                  >
                    {Object.entries(COMPETENCY_AXIS_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={skillPrinciples}
                  onChange={(e) => setSkillPrinciples(e.target.value)}
                  placeholder="Bài học cốt lõi để người khác (hoặc AI) áp dụng lại được ngay..."
                  className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-xs text-foreground"
                />
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={skillEvidence}
                    onChange={(e) => setSkillEvidence(e.target.value)}
                    placeholder="Link minh chứng / tên file đã chạy thử (nếu có)"
                    className="rounded-xl border border-border bg-canvas px-3 py-1.5 text-xs text-foreground flex-1"
                  />
                  <button
                    type="submit"
                    disabled={distillSkillMutation.isPending}
                    className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-canvas"
                  >
                    Lưu bí kíp
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Research Milestones Thread */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <FlaskConical className="w-4 h-4 text-sky-500" />
                Các bước tìm hiểu &amp; kiểm chứng bài toán
              </h2>
              <span className="text-xs text-muted">
                {venture.rdd_nodes.filter((n) => n.status === 'verified').length}/
                {venture.rdd_nodes.length} bước hoàn tất
              </span>
            </div>

            <div className="space-y-2.5">
              {venture.rdd_nodes.map((node) => {
                const friendly = FRIENDLY_NODE_LABELS[node.node_type] ?? {
                  label: node.node_type,
                };
                return (
                  <div
                    key={node.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-canvas p-3.5"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleRddMutation.mutate(node.id)}
                        title="Bấm để đánh dấu đã kiểm chứng xong"
                        className="mt-0.5 shrink-0"
                      >
                        {node.status === 'verified' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted hover:text-foreground" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 font-medium text-foreground">
                            <NodeTypeIcon nodeType={node.node_type} className="w-3 h-3 text-muted" />
                            {friendly.label}
                          </span>
                          <span className="text-muted">cùng AI {node.persona}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground mt-1">{node.title}</p>
                      </div>
                    </div>

                    {node.status !== 'verified' && (
                      <button
                        type="button"
                        onClick={() => void spawnNodeBounty(node)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted hover:text-foreground"
                      >
                        <HandHelping className="w-3.5 h-3.5" />
                        Nhờ đồng đội giúp
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Feedback -> Return Research Loop Thread */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3.5">
            <div>
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <RefreshCw className="w-4 h-4 text-purple-500" />
                Tiếng nói người dùng &amp; Ý tưởng nâng cấp vòng sau
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Phản hồi thực tế khi chạy MVP/Unikorn được gom về đây — bấm 1 nút để mở lại nghiên cứu vòng V{venture.cycle_number + 1}.
              </p>
            </div>

            <div className="space-y-2.5">
              {telemetry.length === 0 ? (
                <p className="text-xs text-muted">
                  Chưa có phản hồi thực tế nào. Dùng mục Ghi nhận phản hồi User ở trên để thêm ngay nhé.
                </p>
              ) : (
                telemetry.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-canvas p-3.5"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 font-medium text-foreground">
                          {ev.event_type === 'friction' ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              User vướng mắc
                            </>
                          ) : ev.event_type === 'feature_pull' ? (
                            <>
                              <Sparkles className="w-3 h-3 text-sky-500" />
                              Nhu cầu mới
                            </>
                          ) : ev.event_type === 'crash' ? (
                            <>
                              <Bug className="w-3 h-3 text-red-500" />
                              Lỗi thực tế
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3 h-3 text-purple-500" />
                              Hiệu năng
                            </>
                          )}
                        </span>
                        {ev.metric_delta && (
                          <span className="text-muted font-medium">{ev.metric_delta}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">{ev.title}</p>
                    </div>

                    {ev.status === 'open' ? (
                      <button
                        type="button"
                        disabled={convertSparkMutation.isPending}
                        onClick={() => convertSparkMutation.mutate(ev.id)}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-canvas hover:opacity-90"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Mở cải tiến V{venture.cycle_number + 1}
                      </button>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <Check className="w-3.5 h-3.5" />
                        Đã chuyển sang vòng nghiên cứu
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Social Activity Timeline */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3.5">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity className="w-4 h-4 text-foreground" />
              Dòng nhật ký đồng đội &amp; AI gần đây
            </h2>
            <div className="space-y-3">
              {habitLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center font-semibold shrink-0',
                      log.actor_type === 'ai_agent'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-subtle text-foreground'
                    )}
                  >
                    {log.actor_type === 'ai_agent' ? (
                      <Bot className="w-3.5 h-3.5" />
                    ) : (
                      getInitials(log.actor_name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0 rounded-xl bg-canvas border border-border/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">{log.actor_name}</span>
                      <span className="text-[10px] text-muted">{log.logged_date}</span>
                    </div>
                    <p className="text-muted mt-0.5">{log.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR (5 cols): 3 Clean, Welcoming Cards */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card R1: MVP & Unikorn Launchpad */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <Rocket className="w-4 h-4 text-emerald-500" />
                Bản dựng MVP &amp; Ra mắt Unikorn
              </h2>
              <button
                type="button"
                onClick={() => {
                  setMvpUrlInput(venture.mvp_url ?? '');
                  setRepoUrlInput(venture.repo_url ?? '');
                  setEditingUrls((v) => !v);
                }}
                className="text-xs font-medium text-muted hover:text-foreground"
              >
                {editingUrls ? 'Đóng' : 'Cập nhật link'}
              </button>
            </div>

            {editingUrls && (
              <div className="space-y-2 rounded-xl border border-border bg-canvas p-3">
                <input
                  type="url"
                  value={mvpUrlInput}
                  onChange={(e) => setMvpUrlInput(e.target.value)}
                  placeholder="Link dùng thử sản phẩm (https://...)"
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground"
                />
                <input
                  type="url"
                  value={repoUrlInput}
                  onChange={(e) => setRepoUrlInput(e.target.value)}
                  placeholder="Link GitHub Repo (https://github.com/...)"
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground"
                />
                <button
                  type="button"
                  onClick={() => saveUrlsMutation.mutate()}
                  className="rounded-full bg-foreground px-3.5 py-1 text-xs font-medium text-canvas"
                >
                  Lưu link
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-canvas border border-border/70 p-3">
                <div className="text-[11px] text-muted flex items-center gap-1">
                  <Users className="w-3 h-3" /> Người đang dùng
                </div>
                <div className="text-xl font-semibold text-foreground tabular-nums mt-0.5">
                  {venture.unikorn_metrics.active_users}
                </div>
              </div>
              <div className="rounded-xl bg-canvas border border-border/70 p-3">
                <div className="text-[11px] text-muted flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Quay lại sau 7 ngày
                </div>
                <div className="text-xl font-semibold text-foreground tabular-nums mt-0.5">
                  {venture.unikorn_metrics.retention_7d}%
                </div>
              </div>
              <div className="rounded-xl bg-canvas border border-border/70 p-3">
                <div className="text-[11px] text-muted flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> Tốc độ phản hồi
                </div>
                <div className="text-xl font-semibold text-foreground tabular-nums mt-0.5">
                  {venture.unikorn_metrics.p95_latency_ms} ms
                </div>
              </div>
              <div className="rounded-xl bg-canvas border border-border/70 p-3">
                <div className="text-[11px] text-muted flex items-center gap-1">
                  <Target className="w-3 h-3" /> Độ tin cậy
                </div>
                <div className="text-xl font-semibold text-foreground tabular-nums mt-0.5">
                  {venture.unikorn_metrics.verified_accuracy}%
                </div>
              </div>
            </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {venture.mvp_url && (
                  <a
                    href={venture.mvp_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-3 py-1.5 font-medium text-foreground hover:bg-subtle"
                  >
                    Dùng thử bản Live <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {venture.repo_url && (
                  <a
                    href={venture.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-3 py-1.5 font-medium text-foreground hover:bg-subtle"
                  >
                    Xem Mã nguồn <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <Link
                  to="/admin/reports/new"
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 font-medium text-canvas hover:opacity-90"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  Viết Báo cáo xuất bản
                </Link>
              </div>

            <div className="rounded-xl border border-border/70 bg-canvas p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Điều kiện để ra mắt Unikorn tự tin
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <Check className="w-3 h-3" /> Mức độ sẵn sàng ≥ 85%
                </span>
                <span
                  className={
                    venture.readiness_score >= 85
                      ? 'text-emerald-600 font-semibold'
                      : 'text-amber-600 font-semibold'
                  }
                >
                  {venture.readiness_score}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <Check className="w-3 h-3" /> Đúc kết ít nhất 2 bí kíp kỹ năng
                </span>
                <span
                  className={
                    verifiedSkillsCount >= 2
                      ? 'text-emerald-600 font-semibold'
                      : 'text-amber-600 font-semibold'
                  }
                >
                  {verifiedSkillsCount}/2
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <Check className="w-3 h-3" /> Đã chốt an toàn (không vỡ hệ thống)
                </span>
                <span
                  className={
                    hasVerifiedFmea
                      ? 'text-emerald-600 font-semibold'
                      : 'text-amber-600 font-semibold'
                  }
                >
                  {hasVerifiedFmea ? 'Đã chốt' : 'Đang chờ'}
                </span>
              </div>
            </div>
          </div>

          {/* Card R2: Collectible Problem Skills Card */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Bí Kíp Kỹ Năng Của Bài Toán ({skills.length})
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Giải xong bước nào, lưu lại thành bí kíp và dạy cho AI Buddy dùng luôn!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposerMode('skill')}
                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-subtle px-3 py-1.5 text-xs font-medium text-foreground hover:bg-border/60"
              >
                <Sparkles className="w-3 h-3" />+ Lưu bí kíp
              </button>
            </div>

            <div className="space-y-2.5">
              {skills.map((sk) => (
                <div
                  key={sk.id}
                  className="rounded-xl border border-border/80 bg-canvas p-3.5 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
                        <CompetencyAxisIcon axis={sk.competency_axis} className="w-3 h-3" />
                        {COMPETENCY_AXIS_LABELS[sk.competency_axis]}
                      </span>
                      <h3 className="text-xs font-semibold text-foreground mt-0.5">{sk.title}</h3>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0',
                        sk.maturity_level === 'automated_in_ai'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : sk.maturity_level === 'verified'
                            ? 'bg-sky-500/10 text-sky-600'
                            : 'bg-amber-500/10 text-amber-600'
                      )}
                    >
                      {sk.maturity_level === 'automated_in_ai' ? (
                        <>
                          <Bot className="w-2.5 h-2.5" />
                          {sk.injected_ai_name}
                        </>
                      ) : sk.maturity_level === 'gap' ? (
                        'Đang thiếu'
                      ) : (
                        'Đã kiểm chứng'
                      )}
                    </span>
                  </div>

                  {(sk.first_principles || sk.description) && (
                    <p className="text-xs text-muted">{sk.first_principles || sk.description}</p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {sk.maturity_level === 'gap' ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await spawnSkillGapBounty(venture, sk);
                          invalidateAll();
                          toast.success(`Đã mở lời kêu gọi đồng đội học & đóng góp "${sk.title}"`);
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                      >
                        <HandHelping className="w-3 h-3" />
                        Nhờ team bổ sung
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                        <Zap className="w-3 h-3 text-emerald-500" />
                        Đã dùng lại {sk.reuse_count} lần
                      </span>
                    )}

                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const agent = aiAgents.find((a) => a.id === e.target.value);
                        if (agent) {
                          injectAiMutation.mutate({
                            skill: sk,
                            agentId: agent.id,
                            agentName: agent.agent_name,
                          });
                        }
                      }}
                      className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] text-foreground"
                    >
                      <option value="" disabled>
                        {sk.injected_ai_name
                          ? `Đổi AI học (${sk.injected_ai_name})`
                          : 'Dạy cho AI của bạn'}
                      </option>
                      {aiAgents.map((a) => (
                        <option key={a.id} value={a.id}>
                          Dạy cho {a.agent_name} ({a.owner_name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card R3: Open Participation & R&D Contribution Points */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <Award className="w-4 h-4 text-amber-500" />
                Tham gia &amp; Bảng điểm Đóng góp R&amp;D
              </h2>
              <span className="text-xs text-muted">{participants.length} thành viên</span>
            </div>

            {!hasJoinedCurrentUser ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-canvas p-3">
                <select
                  value={joinRole}
                  onChange={(e) =>
                    setJoinRole(e.target.value as VentureParticipant['role_in_venture'])
                  }
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground flex-1"
                >
                  <option value="co_researcher">Vai trò: Đồng nghiên cứu</option>
                  <option value="builder">Vai trò: Xây dựng MVP</option>
                  <option value="reviewer">Vai trò: Phản biện &amp; Test</option>
                  <option value="market_lead">Vai trò: Phát triển Thị trường</option>
                </select>
                <button
                  type="button"
                  disabled={joinPodMutation.isPending}
                  onClick={() => joinPodMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-canvas hover:opacity-90"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Tham gia ý tưởng
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 py-1 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Bạn đang tham gia nhóm phát triển ý tưởng này
              </div>
            )}

            {/* Contributors Points Leaderboard */}
            {contributorTotals.length > 0 && (
              <div className="space-y-1.5">
                {contributorTotals.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between rounded-lg bg-canvas border border-border/60 px-3 py-1.5 text-xs"
                  >
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {c.points} điểm
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Contribution Ledger Events */}
            {ledger.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <div className="text-[11px] font-medium text-muted">
                  Ghi nhận đóng góp gần nhất:
                </div>
                {ledger.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-muted truncate">
                      <strong className="text-foreground">{item.contributor_name}</strong>: {item.evidence_title}
                    </span>
                    <span className="text-emerald-600 font-semibold shrink-0 tabular-nums">
                      +{item.points}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Active AI Agents & Quick Links */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-[11px] text-muted">
              <div className="flex flex-wrap gap-1.5">
                {[venture.lead_ai_name, ...injectedAgents]
                  .filter((name, idx, arr) => Boolean(name) && arr.indexOf(name) === idx)
                  .map((agentName) => (
                    <span
                      key={agentName}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-canvas px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                    >
                      <Bot className="w-3 h-3 text-emerald-500" />
                      {agentName}
                    </span>
                  ))}
              </div>
              <Link to="/admin/tasks" className="text-foreground font-medium hover:underline">
                Kanban ({relatedTasks.length}) →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
