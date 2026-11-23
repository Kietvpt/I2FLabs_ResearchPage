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
  | 'failure_mode'
  | 'formal_proof'
  | 'ablation';

export type PublicationTrack = 'vibe_preprint' | 'verified_tier1';

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

export interface TreeLineageLink {
  title: string;
  slug?: string;
  node_id?: string;
  node_type?: ReportType | string;
  edge_type?: string;
  label?: string;
  author_persona?: string;
}

export interface PairedPodAttribution {
  human: string;
  agent: string;
  aid?: string;
  pod_role?: 'explorer' | 'formalizer' | 'falsifier' | 'curator';
}

export interface SourceMetadata {
  mission_id?: string;
  node_id?: string;
  sphere_id?: string;
  tier?: number;
  author_persona?: string;
  cognitive_node_type?: string;
  publication_track?: PublicationTrack;
  confidence_score?: number;
  vibe_tldr?: string;
  key_takeaways?: string[];
  paired_pods?: PairedPodAttribution[];
  peer_review_signoff?: {
    reviewer?: string;
    status?: string;
    consensus_percent?: number;
  };
  tree_lineage?: {
    parent_title?: string;
    parent_slug?: string;
    parent_node_id?: string;
    cross_links?: TreeLineageLink[];
  };
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
  publication_track?: PublicationTrack;
  confidence_score?: number | null;
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
