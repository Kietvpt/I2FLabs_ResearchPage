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

export type AdminRole = 'admin' | 'editor';

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

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface Report {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content_md: string;
  cover_image_url: string | null;
  category_id: string | null;
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
  tags?: Tag[];
}

export interface MediaAsset {
  id: string;
  report_id: string | null;
  storage_path: string;
  public_url: string;
  alt_text: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface AdminProfile {
  user_id: string;
  display_name: string;
  role: AdminRole;
  created_at: string;
}

export type ReportInput = Omit<
  Report,
  'id' | 'created_at' | 'updated_at' | 'created_by'
> & {
  tag_names?: string[];
};

export type CategoryInput = Omit<Category, 'id' | 'created_at'>;
