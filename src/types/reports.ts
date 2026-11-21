/**
 * Research Publication & Report Types
 * Core entities for research papers, whitepapers, benchmarks, hypotheses, and co-authoring.
 */

import type { Category, Tag } from './taxonomy';
import type { ResearchDomain } from './domains';

export type ReportType =
  | 'whitepaper'
  | 'research'
  | 'question'
  | 'hypothesis'
  | 'empirical_poc'
  | 'benchmark'
  | 'specification'
  | 'trade_off'
  | 'debate'
  | 'failure_mode';

export type ReportStatus = 'draft' | 'in_review' | 'published' | 'archived';

export type CollaborationMode = 'human_led' | 'co_authored' | 'ai_assisted';

export interface HumanAuthor {
  name: string;
  role?: string;
  avatar_url?: string;
  github?: string;
}

export interface AiContributor {
  agent_name: string;
  role?: string;
  contribution?: string;
}

export interface SourceMetadata {
  mission_id?: string;
  node_id?: string;
  sphere_id?: string;
  tier?: number;
  author_persona?: string;
  inbound_edge?: {
    source_node?: string;
    edge_type?: string;
    edge_label?: string;
    rationale?: string;
  };
  benchmark_metrics?: Record<string, string | number | boolean>;
  sandbox_details?: Record<string, string | number | boolean>;
  debate_details?: {
    personas?: string[];
    consensus_percent?: number;
    topic_debated?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Report {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content_md: string;
  cover_image_url: string | null;
  category_id: string | null;
  domain_id?: string | null;
  report_type: ReportType;
  status: ReportStatus;
  is_featured: boolean;
  version: string;
  reading_time: number;
  human_authors: HumanAuthor[];
  ai_contributors: AiContributor[];
  model_used: string[];
  collaboration_mode: CollaborationMode;
  source_metadata: SourceMetadata;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportWithRelations extends Report {
  category?: Category | null;
  domain?: ResearchDomain | null;
  tags?: Tag[];
}

export type ReportInput = Omit<
  Report,
  'id' | 'created_at' | 'updated_at' | 'created_by'
> & {
  tag_names?: string[];
};
