import { formatSupabaseError, isMissingTableError, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import type {
  DomainInput,
  DomainMemberInput,
  DomainResourceInput,
  ResearchDomain,
  ResearchDomainMember,
  ResearchDomainResource,
  ResearchDomainWithRelations,
} from '@/types/database';

export const DEFAULT_RESEARCH_DOMAINS: ResearchDomainWithRelations[] = [
  {
    id: 'domain-cong-nghe-ai',
    name: 'Công nghệ & Trí tuệ Nhân tạo Tiên phong',
    slug: 'cong-nghe-ai',
    tagline: 'Frontier AI, Multi-Agent Swarms & Autonomous Systems',
    description:
      'Nghiên cứu kiến trúc mô hình nền tảng, giao thức tương tác đa tác tử (IoA/PiperNet), bộ định tuyến công cụ MCP, tối ưu hóa biên dịch và hệ điều hành tác tử Aevum OS.',
    icon: 'Cpu',
    color: '#1A73E8',
    sort_order: 1,
    is_active: true,
    chair_lead: 'Nguyễn Huy Hải (Principal Architect) & An (ENG-AN-7B9F1D)',
    created_by: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    report_count: 5,
    member_count: 3,
    resource_count: 4,
  },
  {
    id: 'domain-y-te-y-sinh',
    name: 'Y tế, Khoa học Sự sống & Y sinh Số',
    slug: 'y-te-y-sinh',
    tagline: 'Computational Biology, Neural Telemetry & Bio-Cybernetics',
    description:
      'Mô hình hóa chuỗi sinh học, phân tích sóng não và nhịp tim HRV thời gian thực, đo lường chỉ số nhận thức người dùng và cộng tác AI trong y học chuẩn xác.',
    icon: 'Activity',
    color: '#0F9D58',
    sort_order: 2,
    is_active: true,
    chair_lead: 'Hội đồng Khoa học Y sinh I2FLabs & Iris (ARC-IRIS-7D94D427)',
    created_by: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    report_count: 3,
    member_count: 2,
    resource_count: 2,
  },
  {
    id: 'domain-giao-duc-nhan-thuc',
    name: 'Giáo dục, Học máy Tương tác & Nhận thức Con người',
    slug: 'giao-duc-nhan-thuc',
    tagline: 'Adaptive Learning, Cognitive Load & EdTech AI',
    description:
      'Tối ưu hóa phễu tiếp thu tri thức, lộ trình học cá nhân hóa thích ứng theo thời gian thực, giảm tải nhận thức ngoại lai và nuôi dưỡng trạng thái Deep Flow.',
    icon: 'GraduationCap',
    color: '#8AB4F8',
    sort_order: 3,
    is_active: true,
    chair_lead: 'Ban Nghiên cứu Giáo dục Khai phóng I2F',
    created_by: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    report_count: 4,
    member_count: 2,
    resource_count: 3,
  },
  {
    id: 'domain-gia-dinh-xa-hoi',
    name: 'Gia đình, Tâm lý & Xã hội Số',
    slug: 'gia-dinh-xa-hoi',
    tagline: 'Digital Family, Societal AI Ethics & Mental Well-being',
    description:
      'Tương tác đa thế hệ trong không gian số, tác động của AI đối với mối liên kết gia đình, bảo vệ quyền riêng tư số và thiết kế công nghệ vị nhân sinh.',
    icon: 'Home',
    color: '#F2994A',
    sort_order: 4,
    is_active: true,
    chair_lead: 'Nhóm Nghiên cứu Xã hội & Gia đình Thông minh',
    created_by: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    report_count: 2,
    member_count: 1,
    resource_count: 1,
  },
  {
    id: 'domain-kinh-te-phap-che',
    name: 'Kinh tế Số, Pháp chế AI & Thể chế Tương lai',
    slug: 'kinh-te-phap-che',
    tagline: 'Algorithmic Governance, Tokenomics & AI Regulation',
    description:
      'Định giá tài sản trí tuệ do AI tạo sinh, hợp đồng thông minh tự trị, khung kiểm toán an toàn AI và chính sách thúc đẩy kinh tế số có trách nhiệm.',
    icon: 'Scale',
    color: '#9334E8',
    sort_order: 5,
    is_active: true,
    chair_lead: 'Viện Chính sách & Pháp chế Công nghệ I2FLabs',
    created_by: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    report_count: 2,
    member_count: 1,
    resource_count: 2,
  },
];

const LOCAL_DOMAINS_KEY = 'i2flabs_local_domains_cache';

function getLocalDomains(): ResearchDomainWithRelations[] {
  try {
    const raw = localStorage.getItem(LOCAL_DOMAINS_KEY);
    if (!raw) return DEFAULT_RESEARCH_DOMAINS;
    const parsed = JSON.parse(raw) as ResearchDomainWithRelations[];
    return parsed.length > 0 ? parsed : DEFAULT_RESEARCH_DOMAINS;
  } catch {
    return DEFAULT_RESEARCH_DOMAINS;
  }
}

function saveLocalDomains(domains: ResearchDomainWithRelations[]) {
  try {
    localStorage.setItem(LOCAL_DOMAINS_KEY, JSON.stringify(domains));
  } catch (err) {
    console.error('Không thể lưu local domains:', err);
  }
}

export async function fetchResearchDomains(): Promise<ResearchDomainWithRelations[]> {
  if (!isSupabaseConfigured) {
    return getLocalDomains();
  }

  try {
    const { data, error } = await supabase
      .from('research_domains')
      .select(`
        *,
        members:research_domain_members(id),
        resources:research_domain_resources(id),
        reports:reports(id)
      `)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        return getLocalDomains();
      }
      throw new Error(formatSupabaseError(error));
    }

    const domains: ResearchDomainWithRelations[] = ((data as any[]) || []).map((row) => ({
      ...row,
      member_count: row.members?.length ?? 0,
      resource_count: row.resources?.length ?? 0,
      report_count: row.reports?.length ?? 0,
      members: undefined,
      resources: undefined,
      reports: undefined,
    }));

    return domains;
  } catch {
    return getLocalDomains();
  }
}

export async function fetchDomainById(id: string): Promise<ResearchDomainWithRelations | null> {
  if (!isSupabaseConfigured) {
    const local = getLocalDomains();
    return local.find((d) => d.id === id || d.slug === id) ?? null;
  }

  try {
    const { data, error } = await supabase
      .from('research_domains')
      .select(`
        *,
        members:research_domain_members(*),
        resources:research_domain_resources(*),
        reports:reports(id, title, slug, status, published_at, reading_time)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return getLocalDomains().find((d) => d.id === id || d.slug === id) ?? null;
      }
      throw new Error(formatSupabaseError(error));
    }

    if (!data) return null;

    const row = data as any;
    return {
      ...row,
      member_count: row.members?.length ?? 0,
      resource_count: row.resources?.length ?? 0,
      report_count: row.reports?.length ?? 0,
    };
  } catch {
    return getLocalDomains().find((d) => d.id === id || d.slug === id) ?? null;
  }
}

export async function createResearchDomain(
  input: DomainInput,
  currentUserId?: string
): Promise<ResearchDomain> {
  const finalSlug = slugify(input.slug || input.name) || `domain-${Date.now()}`;
  const payload = {
    ...input,
    slug: finalSlug,
    created_by: currentUserId ?? input.created_by ?? null,
  };

  if (!isSupabaseConfigured) {
    const newDomain: ResearchDomainWithRelations = {
      ...payload,
      id: `local-domain-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      report_count: 0,
      member_count: 1,
      resource_count: 0,
    };
    const current = getLocalDomains();
    saveLocalDomains([newDomain, ...current]);
    return newDomain;
  }

  try {
    const { data, error } = await supabase
      .from('research_domains')
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        const newDomain: ResearchDomainWithRelations = {
          ...payload,
          id: `local-domain-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          report_count: 0,
          member_count: 1,
          resource_count: 0,
        };
        const current = getLocalDomains();
        saveLocalDomains([newDomain, ...current]);
        return newDomain;
      }
      throw new Error(formatSupabaseError(error));
    }

    return data as ResearchDomain;
  } catch (err: any) {
    if (err.message && !err.message.includes('Database error')) {
      throw err;
    }
    const newDomain: ResearchDomainWithRelations = {
      ...payload,
      id: `local-domain-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      report_count: 0,
      member_count: 1,
      resource_count: 0,
    };
    const current = getLocalDomains();
    saveLocalDomains([newDomain, ...current]);
    return newDomain;
  }
}

export async function updateResearchDomain(
  id: string,
  updates: Partial<DomainInput>
): Promise<ResearchDomain> {
  const payload = {
    ...updates,
    slug: updates.slug ? slugify(updates.slug) : undefined,
  };

  const applyLocalUpdate = () => {
    const current = getLocalDomains();
    const updated = current.map((d) =>
      d.id === id
        ? {
            ...d,
            ...updates,
            slug: updates.slug ? slugify(updates.slug) : d.slug,
            updated_at: new Date().toISOString(),
          }
        : d
    );
    saveLocalDomains(updated);
    return updated.find((d) => d.id === id) as ResearchDomain;
  };

  if (!isSupabaseConfigured) {
    return applyLocalUpdate();
  }

  try {
    const { data, error } = await supabase
      .from('research_domains')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return applyLocalUpdate();
      }
      throw new Error(formatSupabaseError(error));
    }

    return data as ResearchDomain;
  } catch {
    return applyLocalUpdate();
  }
}

export async function deleteResearchDomain(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const current = getLocalDomains();
    saveLocalDomains(current.filter((d) => d.id !== id));
    return;
  }

  try {
    const { error } = await supabase.from('research_domains').delete().eq('id', id);
    if (error) {
      if (isMissingTableError(error)) {
        const current = getLocalDomains();
        saveLocalDomains(current.filter((d) => d.id !== id));
        return;
      }
      throw new Error(formatSupabaseError(error));
    }
  } catch {
    const current = getLocalDomains();
    saveLocalDomains(current.filter((d) => d.id !== id));
  }
}

// ============================================================================
// Domain Faculty Members API
// ============================================================================

export async function fetchDomainMembers(domainId: string): Promise<ResearchDomainMember[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('research_domain_members')
      .select('*')
      .eq('domain_id', domainId)
      .order('joined_at', { ascending: true });

    if (error) throw new Error(formatSupabaseError(error));
    return (data as ResearchDomainMember[]) || [];
  } catch {
    return [];
  }
}

export async function addDomainMember(
  input: DomainMemberInput
): Promise<ResearchDomainMember> {
  if (!isSupabaseConfigured) {
    return {
      ...input,
      id: `local-mem-${Date.now()}`,
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    } as ResearchDomainMember;
  }

  const { data, error } = await supabase
    .from('research_domain_members')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return data as ResearchDomainMember;
}

export async function removeDomainMember(memberId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('research_domain_members')
    .delete()
    .eq('id', memberId);

  if (error) throw new Error(formatSupabaseError(error));
}

// ============================================================================
// Domain Scientific Resources API
// ============================================================================

export async function fetchDomainResources(domainId: string): Promise<ResearchDomainResource[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('research_domain_resources')
      .select('*')
      .eq('domain_id', domainId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(formatSupabaseError(error));
    return (data as ResearchDomainResource[]) || [];
  } catch {
    return [];
  }
}

export async function createDomainResource(
  input: DomainResourceInput
): Promise<ResearchDomainResource> {
  if (!isSupabaseConfigured) {
    return {
      ...input,
      id: `local-res-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as ResearchDomainResource;
  }

  const { data, error } = await supabase
    .from('research_domain_resources')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return data as ResearchDomainResource;
}

export async function deleteDomainResource(resourceId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('research_domain_resources')
    .delete()
    .eq('id', resourceId);

  if (error) throw new Error(formatSupabaseError(error));
}
