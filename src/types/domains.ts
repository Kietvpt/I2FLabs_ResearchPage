/**
 * Research Domains & Faculty Resource Governance Types
 * Defines the 5 Strategic Macro Research Domains, Faculty Members, and Scientific Resources.
 */

import type { Report } from './reports';

export type DomainMemberType = 'human' | 'ai_persona';

export type DomainFacultyRole =
  | 'chair_lead'
  | 'principal_investigator'
  | 'lead_reviewer'
  | 'researcher'
  | 'fellow'
  | 'advisor';

export type DomainMemberRole = DomainFacultyRole;

export type DomainMemberStatus = 'active' | 'emeritus' | 'suspended' | 'pending';

export type ScientificResourceType =
  | 'dataset'
  | 'benchmark_suite'
  | 'code_artifact'
  | 'methodology_spec'
  | 'telemetry_dump'
  | 'peer_review'
  | 'literature_review'
  | 'domain_handbook'
  | 'document'
  | 'file'
  | 'tool'
  | 'budget'
  | 'metric'
  | 'note';

export type DomainResourceType = ScientificResourceType;

export type DomainAccessLevel = 'private' | 'domain_only' | 'public';

export interface ResearchDomain {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  chair_lead: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomDomain = ResearchDomain;

export interface DomainMemberPermissions {
  can_publish_report?: boolean;
  can_review_draft?: boolean;
  can_manage_datasets?: boolean;
  can_manage_telemetry?: boolean;
  can_invite_fellow?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  [key: string]: boolean | undefined;
}

export interface ResearchDomainMember {
  id: string;
  domain_id: string;
  user_id: string | null;
  member_name: string;
  email: string | null;
  avatar_url: string | null;
  member_type: DomainMemberType;
  persona_aid: string | null;
  role: DomainFacultyRole;
  specialty_focus: string | null;
  permissions: DomainMemberPermissions;
  status: DomainMemberStatus;
  joined_at: string;
  created_at: string;
}

export type DomainMember = ResearchDomainMember;

export interface ResearchDomainResource {
  id: string;
  domain_id: string;
  report_id: string | null;
  title: string;
  slug: string | null;
  resource_type: ScientificResourceType;
  description: string | null;
  content_md: string;
  file_url: string | null;
  doi_or_arxiv: string | null;
  telemetry_payload: Record<string, unknown>;
  tags: string[];
  access_level: DomainAccessLevel;
  created_by: string | null;
  created_by_member_id: string | null;
  created_at: string;
  updated_at: string;
}

export type DomainResource = ResearchDomainResource;

export interface ResearchDomainWithRelations extends ResearchDomain {
  members?: ResearchDomainMember[];
  resources?: ResearchDomainResource[];
  reports?: Report[];
  report_count?: number;
  member_count?: number;
  resource_count?: number;
}

export type DomainWithRelations = ResearchDomainWithRelations;

export type DomainInput = Omit<
  ResearchDomain,
  'id' | 'created_at' | 'updated_at'
>;

export type DomainMemberInput = Omit<
  ResearchDomainMember,
  'id' | 'created_at' | 'joined_at'
>;

export type DomainResourceInput = Omit<
  ResearchDomainResource,
  'id' | 'created_at' | 'updated_at'
>;

