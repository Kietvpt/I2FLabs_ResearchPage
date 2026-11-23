import { useMemo, useRef, useState, useEffect, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  CheckSquare,
  MessageSquare,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useDomains } from '@/context/DomainContext';
import {
  createResearchTask,
  fetchResearcherAiAgents,
  fetchWorkspaceMessages,
  postWorkspaceMessage,
} from '@/features/workspace/api';
import { cn } from '@/lib/utils';
import type {
  WorkspaceChatChannel,
  WorkspaceMessage,
} from '@/types/database';

interface WorkspaceChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

const CHANNEL_TABS: Array<{ id: WorkspaceChatChannel; label: string }> = [
  { id: 'pod', label: 'Pod Chat' },
  { id: 'council', label: 'Council Gate' },
  { id: 'direct', label: '1-1 AI Twin' },
];

export function WorkspaceChatDrawer({ open, onClose }: WorkspaceChatDrawerProps) {
  const { adminProfile, user } = useAuth();
  const { domains, selectedDomainId } = useDomains();
  const queryClient = useQueryClient();

  const [channel, setChannel] = useState<WorkspaceChatChannel>('pod');
  const [targetAgent, setTargetAgent] = useState<string>('');
  const [draft, setDraft] = useState('');
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const activeDomain = useMemo(
    () => domains.find((d) => d.id === selectedDomainId) ?? null,
    [domains, selectedDomainId]
  );

  const senderName =
    adminProfile?.display_name || user?.email?.split('@')[0] || 'Researcher';

  const { data: messages = [] } = useQuery({
    queryKey: ['ws-messages', selectedDomainId],
    queryFn: () => fetchWorkspaceMessages(selectedDomainId),
    enabled: open,
  });

  const { data: aiAgents = [] } = useQuery({
    queryKey: ['ws-ai-agents', selectedDomainId],
    queryFn: () => fetchResearcherAiAgents(selectedDomainId),
    enabled: open,
  });

  const filteredMessages = useMemo(
    () => messages.filter((m) => m.channel === channel),
    [messages, channel]
  );

  useEffect(() => {
    if (open) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, filteredMessages.length]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const domainParam = selectedDomainId !== 'all' ? selectedDomainId : null;
      const saved = await postWorkspaceMessage({
        domain_id: domainParam,
        topic_id: null,
        channel,
        sender_type: 'human',
        sender_name: senderName,
        sender_aid: null,
        target_agent_name: channel === 'direct' ? targetAgent : null,
        content: text,
        linked_task_id: null,
      });

      // Quick command /bounty creates a real Research Task automatically
      if (text.trim().toLowerCase().startsWith('/bounty ')) {
        const bountyTitle = text.trim().slice(8).trim();
        if (bountyTitle) {
          await createResearchTask({
            domain_id: domainParam,
            topic_id: null,
            title: bountyTitle,
            description: `Tạo từ Chat Drawer bởi ${senderName}`,
            task_type: 'vibe_spark',
            status: 'backlog',
            priority: 'medium',
            assignee_human_name: 'Open Bounty',
            assignee_ai_name: targetAgent || null,
            assignee_ai_id: aiAgents.find((a) => a.agent_name === targetAgent)?.id ?? null,
            is_bounty: true,
            due_date: null,
          });
          void queryClient.invalidateQueries({ queryKey: ['ws-tasks'] });
          toast.success(`Đã mở Research Bounty: "${bountyTitle}"`);
        }
      }

      // If messaging in 1-1 AI Twin or @mentioning a known AI researcher, append contextual acknowledgement
      const mentioned = aiAgents.find(
        (a) =>
          (channel === 'direct' && a.agent_name === targetAgent) ||
          text.toLowerCase().includes(`@${a.agent_name.toLowerCase()}`)
      );

      if (mentioned) {
        await postWorkspaceMessage({
          domain_id: domainParam,
          topic_id: null,
          channel,
          sender_type: 'ai_agent',
          sender_name: mentioned.agent_name,
          sender_aid: mentioned.persona_aid,
          target_agent_name: senderName,
          content: `[${mentioned.pod_role.toUpperCase()} · ${mentioned.model_name}] Đã tiếp nhận từ ${senderName}: "${text.slice(0, 110)}${text.length > 110 ? '...' : ''}". Sẵn sàng đồng bộ qua Aevum MCP hoặc chuyển thành task trên Kanban.`,
          linked_task_id: null,
        });
      }

      return saved;
    },
    onSuccess: () => {
      setDraft('');
      void queryClient.invalidateQueries({ queryKey: ['ws-messages'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean || sendMutation.isPending) return;
    sendMutation.mutate(clean);
  };

  const handleConvertToTask = async (msg: WorkspaceMessage) => {
    try {
      await createResearchTask({
        domain_id: selectedDomainId !== 'all' ? selectedDomainId : null,
        topic_id: msg.topic_id,
        title: msg.content.slice(0, 90),
        description: `Chuyển từ tin nhắn của ${msg.sender_name} (${msg.channel})`,
        task_type: 'vibe_spark',
        status: 'backlog',
        priority: 'medium',
        assignee_human_name: msg.sender_type === 'human' ? msg.sender_name : senderName,
        assignee_ai_name: msg.sender_type === 'ai_agent' ? msg.sender_name : targetAgent,
        assignee_ai_id: null,
        is_bounty: false,
        due_date: null,
      });
      void queryClient.invalidateQueries({ queryKey: ['ws-tasks'] });
      toast.success('Đã chuyển tin nhắn thành Nhiệm vụ nghiên cứu');
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo nhiệm vụ');
    }
  };

  if (!open) return null;

  return (
    <aside
      className="w-full sm:w-[360px] border-l border-border bg-surface flex flex-col h-screen sticky top-0 shrink-0 z-30"
      aria-label="Symbiotic Research Chat"
    >
      {/* Header */}
      <div className="h-14 px-4 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-accent shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">
              Symbiotic Chat
            </span>
          </div>
          <p className="text-[11px] text-muted truncate">
            {activeDomain ? activeDomain.name : 'Toàn viện I2FLabs'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
          title="Đóng Chat Drawer (Ctrl+J)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Channel Switcher */}
      <div className="px-3 py-2 border-b border-border/70 flex items-center gap-1 shrink-0 bg-canvas/50">
        {CHANNEL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setChannel(tab.id)}
            className={cn(
              'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
              channel === tab.id
                ? 'bg-foreground text-canvas'
                : 'text-muted hover:text-foreground hover:bg-subtle'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Direct Agent Selector */}
      {channel === 'direct' && (
        <div className="px-3 py-2 border-b border-border/70 flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted shrink-0">Tác tử AI:</span>
          <select
            value={targetAgent}
            onChange={(e) => setTargetAgent(e.target.value)}
            className="flex-1 rounded-md border border-border bg-canvas px-2 py-1 text-xs text-foreground focus:outline-none"
          >
            {aiAgents.map((a) => (
              <option key={a.id} value={a.agent_name}>
                {a.agent_name} ({a.pod_role} · {a.owner_name})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Sparkles className="w-6 h-6 text-muted mx-auto mb-2" />
            <p className="text-xs text-muted leading-relaxed">
              Chưa có trao đổi nào trong kênh này. Nhắn tin để thảo luận cùng Human team hoặc @tên Agent (VD: <code className="bg-subtle px-1 rounded">@An</code>, <code className="bg-subtle px-1 rounded">@Kai</code>).
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isAi = msg.sender_type === 'ai_agent';
            return (
              <div
                key={msg.id}
                className={cn(
                  'group rounded-xl border p-3 text-xs transition-colors',
                  isAi
                    ? 'border-border bg-subtle/50'
                    : 'border-border/80 bg-canvas'
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isAi ? (
                      <Bot className="w-3.5 h-3.5 text-accent shrink-0" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-muted shrink-0" />
                    )}
                    <span className="font-semibold text-foreground truncate">
                      {msg.sender_name}
                    </span>
                    <span className="rounded border border-border px-1.5 py-0.2 text-[10px] text-muted">
                      {isAi ? msg.sender_aid || 'AI Twin' : 'Human'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleConvertToTask(msg)}
                    className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted hover:text-foreground hover:bg-subtle transition"
                    title="Chuyển thành Nhiệm vụ nghiên cứu"
                  >
                    <CheckSquare className="w-3 h-3" />
                    Task
                  </button>
                </div>
                <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Quick Slash Chips + Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-canvas/40 space-y-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: '/bounty', snippet: '/bounty ' },
            { label: '@An', snippet: '@An ' },
            { label: '@Kai', snippet: '@Kai ' },
            { label: '@Valerie', snippet: '@Valerie ' },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => setDraft((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${chip.snippet}`)}
              className="rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-muted hover:text-foreground hover:border-border-hover"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim()) sendMutation.mutate(draft.trim());
              }
            }}
            placeholder={
              channel === 'direct'
                ? `Nhắn cho ${targetAgent}...`
                : 'Trao đổi nhóm, /bounty <tên việc>, hoặc @Agent...'
            }
            className="flex-1 resize-none rounded-lg border border-border bg-canvas px-2.5 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sendMutation.isPending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-canvas hover:opacity-90 disabled:opacity-40 shrink-0"
            aria-label="Gửi tin nhắn"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
}
