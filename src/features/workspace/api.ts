import {
  formatSupabaseError,
  isMissingTableError,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import type {
  ResearchDomainMember,
  ResearchTask,
  ResearchTaskInput,
  WorkspaceTaskStatus,
  ResearchTopic,
  ResearchTopicInput,
  ResearcherAiAgent,
  ResearcherAiAgentInput,
  ResearcherProfile,
  WorkspaceMessage,
  WorkspaceMessageInput,
} from '@/types/database';

// ============================================================================
// Researcher Profiles (Auto-Synced from Supabase auth.users via Trigger 010)
// ============================================================================
export async function fetchResearcherProfiles(): Promise<ResearcherProfile[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('researcher_profiles')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(formatSupabaseError(error));
  }
  return (data as ResearcherProfile[]) || [];
}

// ============================================================================
// Domain Members (All Domains) — Strictly from DB
// ============================================================================
export async function fetchAllDomainMembers(): Promise<ResearchDomainMember[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('research_domain_members')
    .select('*')
    .order('joined_at', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(formatSupabaseError(error));
  }
  return (data as ResearchDomainMember[]) || [];
}

// ============================================================================
// Personal AI Researcher Fleet API (1 Human <-> N AI Researchers) — Strictly DB
// ============================================================================
export async function fetchResearcherAiAgents(domainId?: string): Promise<ResearcherAiAgent[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('researcher_ai_agents')
    .select('*')
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (domainId && domainId !== 'all') {
    query = query.or(`domain_id.eq.${domainId},domain_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(formatSupabaseError(error));
  }
  return (data as ResearcherAiAgent[]) || [];
}

export async function createResearcherAiAgent(
  input: ResearcherAiAgentInput
): Promise<ResearcherAiAgent> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình. Không thể tạo Cộng sự AI.');
  }

  const { data, error } = await supabase
    .from('researcher_ai_agents')
    .insert(input)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as ResearcherAiAgent;
}

export async function updateResearcherAiAgent(
  id: string,
  patch: Partial<ResearcherAiAgentInput>
): Promise<ResearcherAiAgent> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { data, error } = await supabase
    .from('researcher_ai_agents')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as ResearcherAiAgent;
}

export async function deleteResearcherAiAgent(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { error } = await supabase.from('researcher_ai_agents').delete().eq('id', id);
  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}

// ============================================================================
// Research Topics API — Strictly DB
// ============================================================================
export async function fetchResearchTopics(domainId?: string): Promise<ResearchTopic[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('research_topics')
    .select('*')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false });

  if (domainId && domainId !== 'all') {
    query = query.or(`domain_id.eq.${domainId},domain_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(formatSupabaseError(error));
  }
  return (data as ResearchTopic[]) || [];
}

export async function createResearchTopic(input: ResearchTopicInput): Promise<ResearchTopic> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const safeSlug = slugify(input.slug || input.title) || `topic-${Date.now()}`;
  const { data, error } = await supabase
    .from('research_topics')
    .insert({ ...input, slug: safeSlug })
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as ResearchTopic;
}

// ============================================================================
// Research Tasks & Bounties API — Strictly DB
// ============================================================================
export async function fetchResearchTasks(domainId?: string): Promise<ResearchTask[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('research_tasks')
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
  return (data as ResearchTask[]) || [];
}

export async function createResearchTask(input: ResearchTaskInput): Promise<ResearchTask> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { data, error } = await supabase
    .from('research_tasks')
    .insert(input)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as ResearchTask;
}

export async function updateResearchTaskStatus(
  id: string,
  status: WorkspaceTaskStatus
): Promise<ResearchTask> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { data, error } = await supabase
    .from('research_tasks')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as ResearchTask;
}

// ============================================================================
// Workspace Symbiotic Chat API — Strictly DB
// ============================================================================
export async function fetchWorkspaceMessages(domainId?: string): Promise<WorkspaceMessage[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('workspace_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(100);

  if (domainId && domainId !== 'all') {
    query = query.or(`domain_id.eq.${domainId},domain_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(formatSupabaseError(error));
  }
  return (data as WorkspaceMessage[]) || [];
}

export async function postWorkspaceMessage(
  input: WorkspaceMessageInput
): Promise<WorkspaceMessage> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { data, error } = await supabase
    .from('workspace_messages')
    .insert(input)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as WorkspaceMessage;
}
