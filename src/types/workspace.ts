/**
 * Research Workspace AI & Human Dashboard Types
 * Supports Personal AI Researcher Fleet (1 Human <-> N AI), Topics, Tasks/Bounties, and Symbiotic Chat.
 */

import type { PodRole } from './domains';

export type AiAgentScope = 'private_twin' | 'pod_shared' | 'council_reviewer';
export type AiAgentStatus = 'online' | 'researching' | 'idle' | 'archived';

export interface ResearcherProfile {
  user_id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'researcher' | 'reviewer' | 'editor';
  specialty_focus: string;
  avatar_url: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ResearcherAiAgent {
  id: string;
  domain_id: string | null;
  owner_member_id: string | null;
  owner_user_id: string | null;
  owner_name: string;
  agent_name: string;
  persona_aid: string;
  pod_role: PodRole;
  ai_scope: AiAgentScope;
  specialty_focus: string | null;
  model_name: string;
  custom_instructions: string | null;
  mcp_key_id: string | null;
  status: AiAgentStatus;
  reports_contributed: number;
  created_at: string;
  updated_at: string;
}

export type ResearcherAiAgentInput = Omit<
  ResearcherAiAgent,
  'id' | 'created_at' | 'updated_at' | 'owner_user_id'
>;

export type TopicMode = 'mode_a_vibe' | 'mode_b_pod' | 'mode_c_council';
export type TopicStatus = 'exploring' | 'in_progress' | 'gate2_review' | 'published' | 'archived';

export interface ResearchTopic {
  id: string;
  domain_id: string | null;
  title: string;
  slug: string;
  summary: string | null;
  sphere_id: string | null;
  lead_name: string;
  mode: TopicMode;
  status: TopicStatus;
  progress_percent: number;
  confidence_score: number | null;
  target_node_types: string[];
  completed_node_types: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ResearchTopicInput = Omit<
  ResearchTopic,
  'id' | 'created_at' | 'updated_at' | 'created_by'
>;

export type WorkspaceTaskType =
  | 'vibe_spark'
  | 'formal_proof'
  | 'empirical_poc'
  | 'benchmark'
  | 'fmea_audit'
  | 'publication'
  | 'return_spark'
  | 'skill_bounty';

export type WorkspaceTaskStatus = 'backlog' | 'in_progress' | 'gate2_review' | 'done';
export type WorkspaceTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ResearchTask {
  id: string;
  domain_id: string | null;
  topic_id: string | null;
  title: string;
  description: string | null;
  task_type: WorkspaceTaskType;
  status: WorkspaceTaskStatus;
  priority: WorkspaceTaskPriority;
  assignee_human_name: string | null;
  assignee_ai_name: string | null;
  assignee_ai_id: string | null;
  is_bounty: boolean;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ResearchTaskInput = Omit<
  ResearchTask,
  'id' | 'created_at' | 'updated_at' | 'created_by'
>;

export type WorkspaceChatChannel = 'pod' | 'council' | 'direct';
export type WorkspaceChatSenderType = 'human' | 'ai_agent' | 'system';

export interface WorkspaceMessage {
  id: string;
  domain_id: string | null;
  topic_id: string | null;
  channel: WorkspaceChatChannel;
  sender_type: WorkspaceChatSenderType;
  sender_name: string;
  sender_aid: string | null;
  target_agent_name: string | null;
  content: string;
  linked_task_id: string | null;
  created_by: string | null;
  created_at: string;
}

export type WorkspaceMessageInput = Omit<
  WorkspaceMessage,
  'id' | 'created_at' | 'created_by'
>;
