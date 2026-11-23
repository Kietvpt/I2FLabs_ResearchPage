import {
  formatSupabaseError,
  isMissingTableError,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import { createResearchTask } from '@/features/workspace/api';
import type {
  CompetencyAxis,
  ContributionLedgerEntry,
  ContributionStage,
  EvaluationVerdict,
  ProblemSkill,
  ProblemSkillInput,
  RdHabitLog,
  RdHabitLogInput,
  ResearchVenture,
  ResearchVentureInput,
  SkillMaturity,
  VentureEvaluation,
  VentureParticipant,
  VentureRddItem,
  VentureStage,
  VentureTelemetryEvent,
  VentureTelemetryEventInput,
} from '@/types/database';

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

// Track which venture IDs the current signed-in browser toggled so +1/-1 is clean,
// while the actual upvote count is strictly stored and loaded from Supabase DB.
const LIKED_IDS_KEY = 'i2flabs_foundry_my_upvotes_v1';

export function getMyUpvotedVentureIds(): string[] {
  try {
    const raw = localStorage.getItem(LIKED_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function setMyUpvotedVentureIds(ids: string[]): void {
  try {
    localStorage.setItem(LIKED_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignore storage errors
  }
}

// ============================================================================
// Ventures CRUD & Flywheel State Transitions — Strictly DB
// ============================================================================
export async function fetchResearchVentures(domainId?: string): Promise<ResearchVenture[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('research_ventures')
    .select('*')
    .order('updated_at', { ascending: false });

  if (domainId && domainId !== 'all') {
    query = query.or(`domain_id.eq.${domainId},domain_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(formatSupabaseError(error));
  }
  return (data as ResearchVenture[]) || [];
}

export async function fetchVentureBySlug(slug: string): Promise<ResearchVenture | null> {
  if (!isSupabaseConfigured || !slug) return null;

  const { data, error } = await supabase
    .from('research_ventures')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(formatSupabaseError(error));
  }
  return (data as ResearchVenture | null) ?? null;
}

export async function createQuickSparkVenture(params: {
  domain_id: string | null;
  title: string;
  problem_statement: string;
  target_user: string;
  lead_human_name: string;
  lead_ai_name: string;
  initial_stage?: VentureStage;
  mvp_url?: string;
  repo_url?: string;
}): Promise<ResearchVenture> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình. Không thể tạo dự án mới.');
  }

  const baseSlug = slugify(params.title) || `venture-${Date.now()}`;
  const aiLabel = params.lead_ai_name.trim() || 'AI Twin';
  const defaultRddNodes: VentureRddItem[] = [
    {
      id: `rdd-${Date.now()}-q`,
      node_type: 'question',
      title: `Câu hỏi gốc: Giải quyết "${params.title.trim()}" theo nguyên lý đầu tiên`,
      persona: aiLabel,
      status: 'pending',
    },
    {
      id: `rdd-${Date.now()}-h`,
      node_type: 'hypothesis',
      title: 'Giả thuyết kiến trúc & mô hình giải pháp tối ưu',
      persona: aiLabel,
      status: 'pending',
    },
    {
      id: `rdd-${Date.now()}-p`,
      node_type: 'empirical_poc',
      title: 'Prototype PoC thực nghiệm trong sandbox / dogfooding',
      persona: aiLabel,
      status: 'pending',
    },
    {
      id: `rdd-${Date.now()}-f`,
      node_type: 'failure_mode',
      title: 'Kiểm định FMEA & chốt an toàn trước khi ra mắt Unikorn',
      persona: aiLabel,
      status: 'pending',
    },
  ];

  const initialStage = params.initial_stage ?? 'vibe_spark';
  const payload: ResearchVentureInput = {
    domain_id: params.domain_id,
    topic_id: null,
    title: params.title.trim(),
    slug: `${baseSlug}-${Math.random().toString(36).slice(2, 5)}`,
    problem_statement: params.problem_statement.trim(),
    target_user: params.target_user.trim() || null,
    stage: initialStage,
    cycle_number: 1,
    lead_human_name: params.lead_human_name.trim(),
    lead_ai_name: aiLabel,
    mvp_url: params.mvp_url?.trim() || null,
    repo_url: params.repo_url?.trim() || null,
    readiness_score:
      initialStage === 'prototype_mvp' ? 65 : initialStage === 'deep_rdd' ? 40 : 20,
    upvotes_count: 0,
    unikorn_metrics: { active_users: 0, retention_7d: 0, p95_latency_ms: 0, verified_accuracy: 0 },
    rdd_nodes: defaultRddNodes,
  };

  const { data, error } = await supabase
    .from('research_ventures')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  const createdVenture = data as ResearchVenture;

  await createProblemSkill({
    venture_id: createdVenture.id,
    domain_id: createdVenture.domain_id,
    skill_key: `${slugify(createdVenture.title).slice(0, 24)}_core_skill`,
    title: `Kỹ năng lõi: ${createdVenture.title}`,
    description: 'Kỹ năng trọng tâm sẽ được đúc kết trong quá trình giải bài toán này.',
    competency_axis: 'systems',
    maturity_level: 'gap',
    first_principles: null,
    procedure: null,
    verification_criteria: 'Có evidence chạy thực tế hoặc benchmark đo kiểm.',
    evidence_url: null,
    aevum_skill_id: null,
    owner_human_name: createdVenture.lead_human_name,
    injected_ai_agent_id: null,
    injected_ai_name: null,
    reuse_count: 0,
  });

  await logRdHabit({
    venture_id: createdVenture.id,
    actor_name: createdVenture.lead_human_name,
    actor_type: 'human',
    ritual_type: 'spark_logged',
    note: `Khởi tạo ý tưởng mới "${createdVenture.title}".`,
    duration_minutes: 15,
    logged_date: todayIsoDate(),
  });

  // Register creator as participant & auto-trigger server AI evaluation if migration 009 is active
  try {
    await joinVenturePod(createdVenture.id, createdVenture.lead_human_name, 'owner');
    await triggerServerAiEvaluation(createdVenture.id);
  } catch {
    // Gracefully skip if migration 009 is not yet applied
  }

  return createdVenture;
}

export async function updateVenture(
  id: string,
  patch: Partial<ResearchVentureInput>
): Promise<ResearchVenture> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { data, error } = await supabase
    .from('research_ventures')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as ResearchVenture;
}

export async function toggleVentureUpvoteInDb(venture: ResearchVenture): Promise<{
  updated: ResearchVenture;
  likedIds: string[];
  isLiked: boolean;
}> {
  const likedIds = getMyUpvotedVentureIds();
  const currentlyLiked = likedIds.includes(venture.id);
  const nextCount = Math.max(0, (venture.upvotes_count ?? 0) + (currentlyLiked ? -1 : 1));
  const updated = await updateVenture(venture.id, { upvotes_count: nextCount });
  const nextLikedIds = currentlyLiked
    ? likedIds.filter((id) => id !== venture.id)
    : [...likedIds, venture.id];
  setMyUpvotedVentureIds(nextLikedIds);
  return { updated, likedIds: nextLikedIds, isLiked: !currentlyLiked };
}

export async function toggleVentureRddItem(
  venture: ResearchVenture,
  rddId: string,
  actorName?: string
): Promise<ResearchVenture> {
  const target = venture.rdd_nodes.find((n) => n.id === rddId);
  const becameVerified = target?.status !== 'verified';
  const nextNodes = venture.rdd_nodes.map((n) =>
    n.id === rddId
      ? {
          ...n,
          status: n.status === 'verified' ? ('pending' as const) : ('verified' as const),
          confidence: n.status === 'verified' ? n.confidence : n.confidence ?? 0.88,
        }
      : n
  );
  const verifiedCount = nextNodes.filter((n) => n.status === 'verified').length;
  const ratio = nextNodes.length > 0 ? verifiedCount / nextNodes.length : 0;
  const nextReadiness = Math.min(100, Math.max(20, Math.round(20 + ratio * 75)));

  const updated = await updateVenture(venture.id, {
    rdd_nodes: nextNodes,
    readiness_score: nextReadiness,
  });

  if (becameVerified && target && actorName) {
    await awardContributionPointsSafe({
      venture_id: venture.id,
      contributor_name: actorName,
      stage_earned: 'deep_research',
      points: 25,
      evidence_title: `Hoàn thành bước ${target.node_type}: ${target.title}`,
      verified_by: 'R&D Stage Verification',
    });
  }

  return updated;
}

export async function promoteVentureStage(
  venture: ResearchVenture,
  nextStage: VentureStage,
  verifiedSkillCount: number,
  actorName?: string
): Promise<ResearchVenture> {
  if (
    venture.stage === 'vibe_spark' &&
    nextStage !== 'vibe_spark' &&
    venture.evaluation_status &&
    venture.evaluation_status !== 'approved_for_dev'
  ) {
    throw new Error(
      'Cổng thẩm định Server: Ý tưởng cần đạt điểm trung bình >= 70 và có ít nhất 1 thành viên + 1 AI Agent duyệt trước khi bắt đầu chu trình phát triển sản phẩm.'
    );
  }

  if (nextStage === 'unikorn_live') {
    const hasFmea = venture.rdd_nodes.some(
      (n) => n.node_type === 'failure_mode' && n.status === 'verified'
    );
    if (venture.readiness_score < 85 || verifiedSkillCount < 2 || !hasFmea) {
      throw new Error(
        'Phanh FMEA: Cần mức sẵn sàng >= 85%, tối thiểu 2 kỹ năng đã kiểm chứng và hoàn tất chốt an toàn trước khi ra mắt Unikorn.'
      );
    }
  }

  const nextCycle =
    nextStage === 'research_loop' || (venture.stage === 'research_loop' && nextStage === 'deep_rdd')
      ? venture.cycle_number + 1
      : venture.cycle_number;

  const updated = await updateVenture(venture.id, {
    stage: nextStage,
    cycle_number: nextCycle,
  });

  if (actorName && (nextStage === 'prototype_mvp' || nextStage === 'unikorn_live')) {
    await awardContributionPointsSafe({
      venture_id: venture.id,
      contributor_name: actorName,
      stage_earned: nextStage === 'unikorn_live' ? 'unikorn_market' : 'mvp_build',
      points: nextStage === 'unikorn_live' ? 80 : 50,
      evidence_title:
        nextStage === 'unikorn_live'
          ? `Ra mắt sản phẩm Unikorn: ${venture.title}`
          : `Đạt mốc Prototype/MVP: ${venture.title}`,
      verified_by: 'Stage Gate Trigger',
    });
  }

  return updated;
}

// ============================================================================
// Problem Skills CRUD & AI Twin Injection — Strictly DB
// ============================================================================
export async function fetchProblemSkills(ventureId?: string): Promise<ProblemSkill[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('problem_skills')
    .select('*')
    .order('created_at', { ascending: false });
  if (ventureId) query = query.eq('venture_id', ventureId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(formatSupabaseError(error));
  }
  return (data as ProblemSkill[]) || [];
}

export async function createProblemSkill(input: ProblemSkillInput): Promise<ProblemSkill> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { data, error } = await supabase.from('problem_skills').insert(input).select('*').single();
  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  const created = data as ProblemSkill;
  if (input.owner_human_name && input.maturity_level !== 'gap') {
    await awardContributionPointsSafe({
      venture_id: input.venture_id,
      contributor_name: input.owner_human_name,
      stage_earned: 'skill_distill',
      points: 30,
      evidence_title: `Đúc kết kỹ năng: ${created.title}`,
      verified_by: 'Skill Forge',
    });
  }
  return created;
}

export async function injectSkillToAiAgent(
  skill: ProblemSkill,
  agentId: string,
  agentName: string
): Promise<ProblemSkill> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const patch: {
    maturity_level: SkillMaturity;
    injected_ai_agent_id: string | null;
    injected_ai_name: string;
    aevum_skill_id: string;
    reuse_count: number;
  } = {
    maturity_level: 'automated_in_ai',
    injected_ai_agent_id: agentId,
    injected_ai_name: agentName,
    aevum_skill_id: skill.aevum_skill_id || `aevum_${skill.skill_key}`,
    reuse_count: skill.reuse_count + 1,
  };

  const { data, error } = await supabase
    .from('problem_skills')
    .update(patch)
    .eq('id', skill.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as ProblemSkill;
}

export async function spawnSkillGapBounty(
  venture: ResearchVenture,
  skill: ProblemSkill
): Promise<void> {
  await createResearchTask({
    domain_id: venture.domain_id,
    topic_id: venture.topic_id,
    title: `[Skill Bounty · ${skill.competency_axis}] Đúc kết kỹ năng "${skill.title}"`,
    description: `Mở Bounty xây dựng & kiểm chứng kỹ năng xoay quanh bài toán "${venture.title}": ${skill.description || skill.verification_criteria || ''}`,
    task_type: 'skill_bounty',
    status: 'backlog',
    priority: 'high',
    assignee_human_name: 'Open Bounty',
    assignee_ai_name: venture.lead_ai_name || null,
    assignee_ai_id: null,
    is_bounty: true,
    due_date: null,
  });
}

// ============================================================================
// Telemetry Return Loop (Unikorn -> Return Spark V2) — Strictly DB
// ============================================================================
export async function fetchVentureTelemetry(ventureId?: string): Promise<VentureTelemetryEvent[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('venture_telemetry_events')
    .select('*')
    .order('created_at', { ascending: false });
  if (ventureId) query = query.eq('venture_id', ventureId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(formatSupabaseError(error));
  }
  return (data as VentureTelemetryEvent[]) || [];
}

export async function recordTelemetryEvent(
  input: VentureTelemetryEventInput
): Promise<VentureTelemetryEvent> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { data, error } = await supabase
    .from('venture_telemetry_events')
    .insert(input)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as VentureTelemetryEvent;
}

export async function convertTelemetryToReturnSpark(
  venture: ResearchVenture,
  event: VentureTelemetryEvent
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const task = await createResearchTask({
    domain_id: venture.domain_id,
    topic_id: venture.topic_id,
    title: `[Return Spark V${venture.cycle_number + 1}] ${event.title}`,
    description: `Phát sinh từ Telemetry sản phẩm (${event.event_type} · ${event.metric_delta || event.severity}): ${event.detail || ''}`,
    task_type: 'return_spark',
    status: 'backlog',
    priority: event.severity === 'critical' || event.severity === 'high' ? 'urgent' : 'high',
    assignee_human_name: venture.lead_human_name,
    assignee_ai_name: venture.lead_ai_name || null,
    assignee_ai_id: null,
    is_bounty: false,
    due_date: null,
  });

  const { error } = await supabase
    .from('venture_telemetry_events')
    .update({
      status: 'converted_to_spark',
      converted_task_id: task.id,
    })
    .eq('id', event.id);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  await updateVenture(venture.id, {
    stage: 'research_loop',
    cycle_number: venture.cycle_number + 1,
    rdd_nodes: [
      ...venture.rdd_nodes,
      {
        id: `rdd-ret-${Date.now()}`,
        node_type: 'failure_mode',
        title: `[V${venture.cycle_number + 1} Return] ${event.title}`,
        persona: venture.lead_ai_name || 'AI Twin',
        status: 'pending',
      },
    ],
  });

  await logRdHabit({
    venture_id: venture.id,
    actor_name: venture.lead_human_name,
    actor_type: 'human',
    ritual_type: 'telemetry_triaged',
    note: `Chuyển tín hiệu "${event.title}" thành Return Spark mở vòng lặp V${venture.cycle_number + 1}.`,
    duration_minutes: 15,
    logged_date: todayIsoDate(),
  });

  await awardContributionPointsSafe({
    venture_id: venture.id,
    contributor_name: venture.lead_human_name,
    stage_earned: 'return_loop',
    points: 20,
    evidence_title: `Mở vòng cải tiến từ phản hồi: ${event.title}`,
    verified_by: 'Market Feedback Loop',
  });
}

// ============================================================================
// R&D Habit Logs & Elastic Streak Calculator — Strictly DB
// ============================================================================
export async function fetchRdHabitLogs(ventureId?: string): Promise<RdHabitLog[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('rd_habit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (ventureId) query = query.eq('venture_id', ventureId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(formatSupabaseError(error));
  }
  return (data as RdHabitLog[]) || [];
}

export async function logRdHabit(input: RdHabitLogInput): Promise<RdHabitLog> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { data, error } = await supabase.from('rd_habit_logs').insert(input).select('*').single();
  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as RdHabitLog;
}

export function computeElasticHabitStreak(logs: RdHabitLog[]): {
  activeDaysLast7: number;
  todayCount: number;
  totalMinutesWeek: number;
} {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const recent = logs.filter((l) => new Date(l.created_at).getTime() >= sevenDaysAgo);
  const uniqueDays = new Set(recent.map((l) => l.logged_date));
  const today = todayIsoDate();
  const todayCount = logs.filter((l) => l.logged_date === today).length;
  const totalMinutesWeek = recent.reduce((acc, item) => acc + (item.duration_minutes || 15), 0);

  return {
    activeDaysLast7: uniqueDays.size,
    todayCount,
    totalMinutesWeek,
  };
}

export const COMPETENCY_AXIS_LABELS: Record<CompetencyAxis, string> = {
  algorithm: 'Thuật toán & Logic',
  systems: 'Hệ thống & Code',
  product_ux: 'Sản phẩm & UX',
  fmea_safety: 'Độ an toàn & Test',
  unikorn_growth: 'Ra mắt Unikorn',
};

export const FRIENDLY_NODE_LABELS: Record<string, { label: string }> = {
  question: { label: 'Câu hỏi gốc' },
  hypothesis: { label: 'Giả thuyết giải pháp' },
  formal_proof: { label: 'Chứng minh / Công thức' },
  specification: { label: 'Bản thiết kế' },
  empirical_poc: { label: 'Thử nghiệm thực tế' },
  benchmark: { label: 'Đo kiểm số liệu' },
  failure_mode: { label: 'Chốt an toàn (FMEA)' },
  debate: { label: 'Thảo luận nhóm' },
};

export const VENTURE_STAGE_META: Array<{
  stage: VentureStage;
  step: number;
  label: string;
  socialLabel: string;
  shortDesc: string;
  badgeClass: string;
}> = [
  {
    stage: 'vibe_spark',
    step: 1,
    label: '1. Ý tưởng mới',
    socialLabel: 'Vừa nảy ý tưởng',
    shortDesc: 'Viết nhanh nỗi đau & ý tưởng',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  },
  {
    stage: 'deep_rdd',
    step: 2,
    label: '2. Đào sâu nghiên cứu',
    socialLabel: 'Đang đào sâu',
    shortDesc: 'Tìm nguyên lý & kiểm chứng',
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
  },
  {
    stage: 'prototype_mvp',
    step: 3,
    label: '3. Dựng bản chạy thử',
    socialLabel: 'Đang làm MVP',
    shortDesc: 'Làm sản phẩm & dùng thử',
    badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
  },
  {
    stage: 'unikorn_live',
    step: 4,
    label: '4. Ra mắt Unikorn',
    socialLabel: 'Unikorn Live',
    shortDesc: 'Người dùng thật & Tăng trưởng',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  },
  {
    stage: 'research_loop',
    step: 5,
    label: '5. Nâng cấp vòng mới',
    socialLabel: 'Đang cải tiến V2',
    shortDesc: 'Lắng nghe user -> Nghiên cứu tiếp',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
  },
];

// ============================================================================
// Server-Side Idea Evaluations, Coaching & Contribution Points (Migration 009)
// ============================================================================
export async function fetchVentureEvaluations(ventureId: string): Promise<VentureEvaluation[]> {
  if (!isSupabaseConfigured || !ventureId) return [];

  const { data, error } = await supabase
    .from('venture_evaluations')
    .select('*')
    .eq('venture_id', ventureId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(formatSupabaseError(error));
  }
  return (data as VentureEvaluation[]) || [];
}

export async function triggerServerAiEvaluation(
  ventureId: string,
  agentId?: string | null
): Promise<VentureEvaluation> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { data, error } = await supabase.rpc('run_server_ai_evaluation', {
    p_venture_id: ventureId,
    p_agent_id: agentId || null,
  });

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as VentureEvaluation;
}

export async function submitHumanEvaluation(params: {
  venture_id: string;
  evaluator_name: string;
  verdict: EvaluationVerdict;
  market_pain_score: number;
  feasibility_score: number;
  product_viability_score: number;
  novelty_score: number;
  review_note: string;
}): Promise<VentureEvaluation> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { data, error } = await supabase
    .from('venture_evaluations')
    .insert({
      venture_id: params.venture_id,
      evaluator_type: 'human',
      evaluator_name: params.evaluator_name.trim(),
      verdict: params.verdict,
      market_pain_score: params.market_pain_score,
      feasibility_score: params.feasibility_score,
      product_viability_score: params.product_viability_score,
      novelty_score: params.novelty_score,
      review_note: params.review_note.trim(),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  await joinVenturePod(params.venture_id, params.evaluator_name.trim(), 'reviewer');
  await awardContributionPointsSafe({
    venture_id: params.venture_id,
    contributor_name: params.evaluator_name.trim(),
    stage_earned: 'idea_review',
    points: 15,
    evidence_title: `Thẩm định & chấm điểm ý tưởng (${params.verdict})`,
    verified_by: 'Human Peer Review',
  });

  return data as VentureEvaluation;
}

export async function fetchVentureParticipants(
  ventureId?: string
): Promise<VentureParticipant[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('venture_participants')
    .select('*')
    .order('joined_at', { ascending: true });

  if (ventureId) {
    query = query.eq('venture_id', ventureId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(formatSupabaseError(error));
  }
  return (data as VentureParticipant[]) || [];
}

export async function joinVenturePod(
  ventureId: string,
  participantName: string,
  roleInVenture: VentureParticipant['role_in_venture'] = 'co_researcher'
): Promise<VentureParticipant> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { data, error } = await supabase
    .from('venture_participants')
    .upsert(
      {
        venture_id: ventureId,
        participant_name: participantName.trim(),
        role_in_venture: roleInVenture,
      },
      { onConflict: 'venture_id,participant_name' }
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as VentureParticipant;
}

export async function fetchContributionLedger(
  ventureId?: string
): Promise<ContributionLedgerEntry[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('contribution_ledger')
    .select('*')
    .order('created_at', { ascending: false });

  if (ventureId) {
    query = query.eq('venture_id', ventureId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(formatSupabaseError(error));
  }
  return (data as ContributionLedgerEntry[]) || [];
}

export async function awardContributionPointsSafe(params: {
  venture_id: string;
  contributor_name: string;
  stage_earned: ContributionStage;
  points: number;
  evidence_title: string;
  verified_by: string;
}): Promise<void> {
  if (!isSupabaseConfigured || !params.contributor_name.trim()) return;
  try {
    await supabase.from('contribution_ledger').insert({
      venture_id: params.venture_id,
      contributor_name: params.contributor_name.trim(),
      stage_earned: params.stage_earned,
      points: params.points,
      evidence_title: params.evidence_title,
      verified_by: params.verified_by,
    });
  } catch {
    // Gracefully skip if migration 009 is not yet applied
  }
}
