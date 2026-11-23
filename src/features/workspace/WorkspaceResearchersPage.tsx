import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  Bot,
  Copy,
  Edit3,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDomains } from '@/context/DomainContext';
import { useAuth } from '@/context/AuthContext';
import {
  createResearcherAiAgent,
  deleteResearcherAiAgent,
  fetchAllDomainMembers,
  fetchResearcherAiAgents,
  fetchResearcherProfiles,
  updateResearcherAiAgent,
} from '@/features/workspace/api';
import {
  fetchContributionLedger,
  fetchVentureParticipants,
} from '@/features/foundry/api';
import { cn } from '@/lib/utils';
import type {
  AiAgentScope,
  AiAgentStatus,
  PodRole,
  ResearcherAiAgent,
} from '@/types/database';

const POD_ROLES: Array<{ value: PodRole; label: string }> = [
  { value: 'explorer', label: 'Explorer (Vibe Sprint)' },
  { value: 'formalizer', label: 'Formalizer (Math / Spec)' },
  { value: 'falsifier', label: 'Falsifier (PoC / FMEA)' },
  { value: 'curator', label: 'Curator (Publish / GEO)' },
];

const AI_SCOPES: Array<{ value: AiAgentScope; label: string; desc: string }> = [
  { value: 'private_twin', label: 'Private Twin', desc: 'Chỉ phục vụ riêng researcher chủ sở hữu' },
  { value: 'pod_shared', label: 'Pod Shared', desc: 'Chia sẻ phối hợp trong nhóm đề tài' },
  { value: 'council_reviewer', label: 'Council Reviewer', desc: 'Tham gia hội đồng thẩm định chéo Gate 2' },
];

const MODEL_OPTIONS = [
  'Gemini 3.8 Flash High',
  'Gemini 3.8 Flash Medium',
  'Gemini 4 Argon High',
  'Claude Sonnet 4.6 (Thinking)',
  'GPT-5.2',
  'Ollama Local (Qwen 2.5)',
];

export function WorkspaceResearchersPage() {
  const { domains, selectedDomainId } = useDomains();
  const { adminProfile, user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'fleet' | 'humans'>('fleet');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  // Create/Edit AI Researcher modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ResearcherAiAgent | null>(null);
  const [ownerName, setOwnerName] = useState(
    adminProfile?.display_name || user?.email?.split('@')[0] || 'Hai Nguyen'
  );
  const [agentName, setAgentName] = useState('');
  const [personaAid, setPersonaAid] = useState('');
  const [podRole, setPodRole] = useState<PodRole>('explorer');
  const [aiScope, setAiScope] = useState<AiAgentScope>('pod_shared');
  const [modelName, setModelName] = useState(MODEL_OPTIONS[0]);
  const [specialtyFocus, setSpecialtyFocus] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [domainId, setDomainId] = useState(selectedDomainId !== 'all' ? selectedDomainId : '');

  const { data: aiAgents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ['ws-ai-agents', selectedDomainId],
    queryFn: () => fetchResearcherAiAgents(selectedDomainId),
  });

  const { data: domainMembers = [] } = useQuery({
    queryKey: ['ws-all-members'],
    queryFn: fetchAllDomainMembers,
  });

  const { data: researcherProfiles = [] } = useQuery({
    queryKey: ['ws-researcher-profiles'],
    queryFn: fetchResearcherProfiles,
  });

  const { data: contributionLedger = [] } = useQuery({
    queryKey: ['foundry-ledger', 'all'],
    queryFn: () => fetchContributionLedger(),
  });

  const { data: ventureParticipants = [] } = useQuery({
    queryKey: ['foundry-participants', 'all'],
    queryFn: () => fetchVentureParticipants(),
  });

  const pointsByHuman = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of contributionLedger) {
      const k = row.contributor_name.trim().toLowerCase();
      map.set(k, (map.get(k) ?? 0) + row.points);
    }
    return map;
  }, [contributionLedger]);

  const venturesByHuman = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of ventureParticipants) {
      const k = p.participant_name.trim().toLowerCase();
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [ventureParticipants]);

  const humanResearchers = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        email: string | null;
        role: string;
        specialty: string | null;
        agents: ResearcherAiAgent[];
      }
    >();

    for (const p of researcherProfiles) {
      const key = p.display_name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: p.display_name,
          email: p.email,
          role: p.role,
          specialty: p.specialty_focus,
          agents: [],
        });
      }
    }

    for (const m of domainMembers) {
      if (m.member_type !== 'human') continue;
      const key = m.member_name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: m.member_name,
          email: m.email,
          role: m.role,
          specialty: m.specialty_focus,
          agents: [],
        });
      }
    }

    for (const ai of aiAgents) {
      const key = ai.owner_name.trim().toLowerCase();
      const existing = map.get(key) ?? {
        name: ai.owner_name,
        email: null,
        role: 'researcher',
        specialty: null,
        agents: [],
      };
      existing.agents.push(ai);
      map.set(key, existing);
    }

    return Array.from(map.values());
  }, [researcherProfiles, domainMembers, aiAgents]);

  const ownerNames = useMemo(
    () => Array.from(new Set(humanResearchers.map((h) => h.name))),
    [humanResearchers]
  );

  const visibleAgents = useMemo(() => {
    if (ownerFilter === 'all') return aiAgents;
    return aiAgents.filter(
      (a) => a.owner_name.trim().toLowerCase() === ownerFilter.trim().toLowerCase()
    );
  }, [aiAgents, ownerFilter]);

  const openCreateForOwner = (presetOwner?: string) => {
    setEditingAgent(null);
    setOwnerName(presetOwner || adminProfile?.display_name || 'Hai Nguyen');
    setAgentName('');
    setPersonaAid('');
    setPodRole('explorer');
    setAiScope('pod_shared');
    setModelName(MODEL_OPTIONS[0]);
    setSpecialtyFocus('');
    setCustomInstructions('');
    setDomainId(selectedDomainId !== 'all' ? selectedDomainId : '');
    setIsModalOpen(true);
  };

  const openEditAgent = (agent: ResearcherAiAgent) => {
    setEditingAgent(agent);
    setOwnerName(agent.owner_name);
    setAgentName(agent.agent_name);
    setPersonaAid(agent.persona_aid);
    setPodRole(agent.pod_role);
    setAiScope(agent.ai_scope);
    setModelName(agent.model_name);
    setSpecialtyFocus(agent.specialty_focus || '');
    setCustomInstructions(agent.custom_instructions || '');
    setDomainId(agent.domain_id || '');
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const cleanName = agentName.trim();
      const cleanAid =
        personaAid.trim() ||
        `AI-${cleanName.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 6)}-${Math.random()
          .toString(36)
          .slice(2, 6)
          .toUpperCase()}`;

      const payload = {
        domain_id: domainId || null,
        owner_member_id: null,
        owner_name: ownerName.trim() || 'Hai Nguyen',
        agent_name: cleanName,
        persona_aid: cleanAid,
        pod_role: podRole,
        ai_scope: aiScope,
        specialty_focus: specialtyFocus.trim() || null,
        model_name: modelName,
        custom_instructions: customInstructions.trim() || null,
        mcp_key_id: null,
        status: (editingAgent?.status || 'online') as AiAgentStatus,
        reports_contributed: editingAgent?.reports_contributed ?? 0,
      };

      return editingAgent
        ? updateResearcherAiAgent(editingAgent.id, payload)
        : createResearcherAiAgent(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ws-ai-agents'] });
      toast.success(
        editingAgent
          ? `Đã cập nhật AI Researcher "${agentName}"`
          : `Đã thêm AI Researcher "${agentName}" cho ${ownerName}`
      );
      setIsModalOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: AiAgentStatus }) =>
      updateResearcherAiAgent(id, { status: nextStatus }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ws-ai-agents'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResearcherAiAgent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ws-ai-agents'] });
      toast.success('Đã xóa tác tử AI khỏi danh sách');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCloneAgent = async (agent: ResearcherAiAgent) => {
    try {
      await createResearcherAiAgent({
        domain_id: agent.domain_id,
        owner_member_id: agent.owner_member_id,
        owner_name: agent.owner_name,
        agent_name: `${agent.agent_name} (Clone)`,
        persona_aid: `${agent.persona_aid}-C`,
        pod_role: agent.pod_role,
        ai_scope: agent.ai_scope,
        specialty_focus: agent.specialty_focus,
        model_name: agent.model_name,
        custom_instructions: agent.custom_instructions,
        mcp_key_id: null,
        status: 'online',
        reports_contributed: 0,
      });
      void queryClient.invalidateQueries({ queryKey: ['ws-ai-agents'] });
      toast.success(`Đã nhân bản cấu hình "${agent.agent_name}"`);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể nhân bản AI Researcher');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) {
      toast.error('Vui lòng nhập tên tác tử AI');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            Nhà Nghiên Cứu &amp; Đội Tác Tử AI Riêng
          </h1>
          <p className="text-sm text-muted mt-1">
            Quản lý mô hình 1 Human Researcher ↔ N Personal AI Researchers (chuyên môn hóa, phân quyền &amp; điều phối).
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateForOwner()}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-canvas hover:opacity-90 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Thêm AI Researcher riêng
        </button>
      </div>

      {/* Tabs + Owner Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('fleet')}
            className={cn(
              'deepmind-pill-tab',
              activeTab === 'fleet' && 'active'
            )}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Personal AI Fleet ({aiAgents.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('humans')}
            className={cn(
              'deepmind-pill-tab',
              activeTab === 'humans' && 'active'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Human Researchers ({humanResearchers.length})</span>
          </button>
        </div>

        {activeTab === 'fleet' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Lọc theo chủ sở hữu:</span>
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:outline-none"
            >
              <option value="all">Tất cả Researchers ({aiAgents.length})</option>
              {ownerNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Personal AI Fleet */}
      {activeTab === 'fleet' && (
        loadingAgents ? (
          <div className="py-12 text-center text-sm text-muted">Đang tải danh sách AI Researchers...</div>
        ) : visibleAgents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
            <Bot className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-sm text-foreground font-medium">Chưa có AI Researcher nào cho bộ lọc này</p>
            <button
              type="button"
              onClick={() => openCreateForOwner(ownerFilter !== 'all' ? ownerFilter : undefined)}
              className="mt-3 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-canvas"
            >
              + Thêm AI Researcher
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleAgents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-foreground truncate">
                          {agent.agent_name}
                        </span>
                        <span className="rounded border border-border bg-subtle px-1.5 py-0.5 text-[10px] text-muted">
                          {agent.pod_role}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">
                        Owner: <span className="font-medium text-foreground">{agent.owner_name}</span> · {agent.persona_aid}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: agent.id,
                          nextStatus:
                            agent.status === 'online'
                              ? 'researching'
                              : agent.status === 'researching'
                                ? 'idle'
                                : 'online',
                        })
                      }
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0',
                        agent.status === 'researching'
                          ? 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : agent.status === 'online'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'border-border bg-subtle text-muted'
                      )}
                      title="Bấm để chuyển trạng thái"
                    >
                      {agent.status}
                    </button>
                  </div>

                  {agent.specialty_focus && (
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {agent.specialty_focus}
                    </p>
                  )}

                  {agent.custom_instructions && (
                    <p className="rounded-lg border border-border/70 bg-canvas px-2.5 py-2 text-[11px] text-muted line-clamp-2">
                      “{agent.custom_instructions}”
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-2 text-[11px] text-muted">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{agent.model_name}</span>
                    <span>·</span>
                    <span className="shrink-0">{agent.ai_scope}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleCloneAgent(agent)}
                      className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-subtle"
                      title="Nhân bản cấu hình AI"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditAgent(agent)}
                      className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-subtle"
                      title="Chỉnh sửa"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Xóa AI Researcher "${agent.agent_name}"?`)) {
                          deleteMutation.mutate(agent.id);
                        }
                      }}
                      className="p-1.5 rounded-md text-muted hover:text-red-500 hover:bg-subtle"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Tab 2: Human Researchers Roster */}
      {activeTab === 'humans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {humanResearchers.map((hr) => (
            <div
              key={hr.name}
              className="rounded-xl border border-border bg-surface p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-border bg-subtle flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                    {hr.name[0]?.toUpperCase() || 'R'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{hr.name}</h3>
                      <span className="rounded border border-border bg-subtle px-2 py-0.5 text-[10px] text-muted">
                        {hr.role}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {hr.email || hr.specialty || 'I2FLabs Vietnam Research Team'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOwnerFilter(hr.name);
                    setActiveTab('fleet');
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-canvas px-3 py-1 text-[11px] font-medium text-foreground hover:bg-subtle"
                >
                  <Sparkles className="w-3 h-3" />
                  {hr.agents.length} AI Agents
                </button>
              </div>

              <div className="space-y-2">
                {hr.agents.length === 0 ? (
                  <p className="text-xs text-muted italic">
                    Researcher này chưa khởi tạo AI chuyên môn riêng.
                  </p>
                ) : (
                  hr.agents.map((ai) => (
                    <div
                      key={ai.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-canvas/60 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Bot className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span className="font-medium text-foreground truncate">{ai.agent_name}</span>
                        <span className="text-[11px] text-muted truncate">
                          ({ai.pod_role} · {ai.model_name})
                        </span>
                      </div>
                      <span className="text-[10px] text-muted shrink-0">{ai.ai_scope}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                <div className="flex items-center gap-3 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    {venturesByHuman.get(hr.name.trim().toLowerCase()) ?? 0} dự án
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 font-semibold text-foreground tabular-nums">
                    <Award className="w-3 h-3 text-amber-500" />
                    {pointsByHuman.get(hr.name.trim().toLowerCase()) ?? 0} điểm R&amp;D
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openCreateForOwner(hr.name)}
                  className="text-xs font-medium text-foreground hover:text-accent"
                >
                  + Thêm AI riêng cho {hr.name}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create / Edit Personal AI Researcher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-accent" />
              <h2 className="text-base font-semibold text-foreground">
                {editingAgent ? `Cập nhật AI: ${editingAgent.agent_name}` : 'Thêm Personal AI Researcher'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Chủ sở hữu (Human Researcher) *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="VD: Hai Nguyen"
                    className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Tên AI Researcher *
                  </label>
                  <input
                    type="text"
                    required
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="VD: An, Kai, Bio-Scout..."
                    className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Mã Persona AID</label>
                  <input
                    type="text"
                    value={personaAid}
                    onChange={(e) => setPersonaAid(e.target.value)}
                    placeholder="Tự sinh nếu bỏ trống"
                    className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Vai trò Pod</label>
                  <select
                    value={podRole}
                    onChange={(e) => setPodRole(e.target.value as PodRole)}
                    className="w-full rounded-lg border border-border bg-canvas px-2.5 py-2 text-xs text-foreground"
                  >
                    {POD_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Phạm vi (Scope)</label>
                  <select
                    value={aiScope}
                    onChange={(e) => setAiScope(e.target.value as AiAgentScope)}
                    className="w-full rounded-lg border border-border bg-canvas px-2.5 py-2 text-xs text-foreground"
                  >
                    {AI_SCOPES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Model Engine</label>
                  <select
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-canvas px-2.5 py-2 text-xs text-foreground"
                  >
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Miền áp dụng</label>
                  <select
                    value={domainId}
                    onChange={(e) => setDomainId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-canvas px-2.5 py-2 text-xs text-foreground"
                  >
                    <option value="">Toàn viện (Tất cả miền)</option>
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Mảng chuyên môn hẹp
                </label>
                <input
                  type="text"
                  value={specialtyFocus}
                  onChange={(e) => setSpecialtyFocus(e.target.value)}
                  placeholder="VD: Phân tích sóng não EEG, Benchmark độ trễ MCP, Red-team FMEA..."
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Chỉ thị chuyên môn &amp; Ranh giới (Custom Instructions)
                </label>
                <textarea
                  rows={3}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Quy tắc kiểm chứng, nguồn dữ liệu ưu tiên, điều kiện Gate 2..."
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-border px-3.5 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-canvas hover:opacity-90"
                >
                  {saveMutation.isPending ? 'Đang lưu...' : editingAgent ? 'Lưu thay đổi' : 'Tạo AI Researcher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
