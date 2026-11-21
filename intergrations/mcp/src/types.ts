/**
 * Types & Schemas for I2FLabs Aevum MCP Server
 */

export interface AevumLocalNodeStatus {
  online: boolean;
  endpoint: string;
  latencyMs?: number;
  serverVersion?: string;
  activePort?: number;
  status: 'active' | 'degraded' | 'unreachable';
  error?: string;
  timestamp: string;
}

export interface AevumSquadMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  specialty?: string;
}

export interface AevumHandshakeResponse {
  protocolVersion: string;
  workspaceName: string;
  workspacePath: string;
  activePersonas: string[];
  universalCoreTools: string[];
  timestamp: string;
}

export interface ResearchPaperPayload {
  title: string;
  slug?: string;
  summary?: string;
  content_md: string;
  domain_id?: string;
  report_type:
    | 'whitepaper'
    | 'research'
    | 'benchmark'
    | 'empirical_poc'
    | 'specification'
    | 'hypothesis'
    | 'debate'
    | 'trade_off'
    | 'failure_mode'
    | 'question';
  status?: 'draft' | 'in_review' | 'published';
  is_featured?: boolean;
  version?: string;
  tags?: string[];
  model_used?: string[];
  human_authors?: Array<{ name: string; role?: string }>;
  ai_contributors?: Array<{ agent_name: string; role?: string; contribution?: string }>;
  source_metadata?: Record<string, unknown>;
}

export interface CadenceTelemetryPayload {
  session_id: string;
  session_type: 'cadence_50_10' | 'deep_flow' | 'adhoc';
  engineer_alias?: string;
  duration_minutes: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  flow_interruptions: number;
  cognitive_fatigue_score?: number; // 1 to 10
  timestamp: string;
}
