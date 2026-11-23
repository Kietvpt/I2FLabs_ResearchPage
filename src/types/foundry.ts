/**
 * Problem-to-Product Foundry Types (Vibe-to-Unikorn Habit Flywheel)
 * Unifies Problem Definition, RDD Spine, Problem Skills, MVP/Unikorn Metrics & Telemetry Return Loop.
 */

export type VentureStage =
  | 'vibe_spark'
  | 'deep_rdd'
  | 'prototype_mvp'
  | 'unikorn_live'
  | 'research_loop';

export interface UnikornMetrics {
  active_users: number;
  retention_7d: number;
  p95_latency_ms: number;
  verified_accuracy: number;
}

export interface VentureRddItem {
  id: string;
  node_type:
    | 'question'
    | 'hypothesis'
    | 'formal_proof'
    | 'specification'
    | 'empirical_poc'
    | 'benchmark'
    | 'failure_mode'
    | 'debate';
  title: string;
  persona: string;
  status: 'pending' | 'verified';
  confidence?: number;
}

export type EvaluationStatus = 'pending_review' | 'approved_for_dev' | 'revision_needed';
export type EvaluationVerdict = 'approve' | 'needs_revision' | 'reject';

export interface AiCoachingPlan {
  market_validation: string;
  research_focus: string;
  mvp_scope: string;
  go_to_market: string;
}

export interface VentureEvaluation {
  id: string;
  venture_id: string;
  evaluator_type: 'human' | 'ai_agent';
  evaluator_name: string;
  ai_agent_id: string | null;
  verdict: EvaluationVerdict;
  market_pain_score: number;
  feasibility_score: number;
  product_viability_score: number;
  novelty_score: number;
  overall_score: number;
  review_note: string;
  ai_coaching_plan: AiCoachingPlan | null;
  created_by: string | null;
  created_at: string;
}

export interface VentureParticipant {
  id: string;
  venture_id: string;
  participant_name: string;
  participant_user_id: string | null;
  role_in_venture: 'owner' | 'co_researcher' | 'builder' | 'reviewer' | 'market_lead';
  joined_at: string;
}

export type ContributionStage =
  | 'idea_review'
  | 'deep_research'
  | 'skill_distill'
  | 'mvp_build'
  | 'unikorn_market'
  | 'return_loop';

export interface ContributionLedgerEntry {
  id: string;
  venture_id: string;
  contributor_name: string;
  contributor_user_id: string | null;
  stage_earned: ContributionStage;
  points: number;
  evidence_title: string;
  verified_by: string;
  created_at: string;
}

export interface ResearchVenture {
  id: string;
  domain_id: string | null;
  topic_id: string | null;
  title: string;
  slug: string;
  problem_statement: string;
  target_user: string | null;
  stage: VentureStage;
  cycle_number: number;
  lead_human_name: string;
  lead_ai_name: string;
  mvp_url: string | null;
  repo_url: string | null;
  readiness_score: number;
  upvotes_count?: number;
  evaluation_status?: EvaluationStatus;
  evaluation_score?: number;
  human_approvals?: number;
  ai_approvals?: number;
  market_value_note?: string | null;
  unikorn_metrics: UnikornMetrics;
  rdd_nodes: VentureRddItem[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ResearchVentureInput = Omit<
  ResearchVenture,
  'id' | 'created_by' | 'created_at' | 'updated_at'
>;

export type CompetencyAxis =
  | 'algorithm'
  | 'systems'
  | 'product_ux'
  | 'fmea_safety'
  | 'unikorn_growth';

export type SkillMaturity = 'gap' | 'learning' | 'verified' | 'automated_in_ai';

export interface ProblemSkill {
  id: string;
  venture_id: string;
  domain_id: string | null;
  skill_key: string;
  title: string;
  description: string | null;
  competency_axis: CompetencyAxis;
  maturity_level: SkillMaturity;
  first_principles: string | null;
  procedure: string | null;
  verification_criteria: string | null;
  evidence_url: string | null;
  aevum_skill_id: string | null;
  owner_human_name: string | null;
  injected_ai_agent_id: string | null;
  injected_ai_name: string | null;
  reuse_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ProblemSkillInput = Omit<
  ProblemSkill,
  'id' | 'created_by' | 'created_at' | 'updated_at'
>;

export type TelemetryEventType = 'friction' | 'crash' | 'benchmark_drift' | 'feature_pull';
export type TelemetrySeverity = 'low' | 'medium' | 'high' | 'critical';
export type TelemetryStatus = 'open' | 'converted_to_spark' | 'resolved';

export interface VentureTelemetryEvent {
  id: string;
  venture_id: string;
  event_type: TelemetryEventType;
  severity: TelemetrySeverity;
  title: string;
  detail: string | null;
  metric_delta: string | null;
  status: TelemetryStatus;
  converted_task_id: string | null;
  created_by: string | null;
  created_at: string;
}

export type VentureTelemetryEventInput = Omit<
  VentureTelemetryEvent,
  'id' | 'created_by' | 'created_at'
>;

export type HabitRitualType =
  | 'spark_logged'
  | 'rdd_branched'
  | 'poc_shipped'
  | 'skill_distilled'
  | 'telemetry_triaged';

export interface RdHabitLog {
  id: string;
  venture_id: string | null;
  actor_name: string;
  actor_type: 'human' | 'ai_agent';
  ritual_type: HabitRitualType;
  note: string;
  duration_minutes: number;
  logged_date: string;
  created_by: string | null;
  created_at: string;
}

export type RdHabitLogInput = Omit<RdHabitLog, 'id' | 'created_by' | 'created_at'>;
