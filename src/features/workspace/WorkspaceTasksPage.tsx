import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  GripVertical,
  Plus,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDomains } from '@/context/DomainContext';
import {
  createResearchTask,
  fetchResearchTasks,
  fetchResearchTopics,
  fetchResearcherAiAgents,
  updateResearchTaskStatus,
} from '@/features/workspace/api';
import { cn } from '@/lib/utils';
import type {
  ResearchTask,
  WorkspaceTaskPriority,
  WorkspaceTaskStatus,
  WorkspaceTaskType,
} from '@/types/database';

const COLUMNS: Array<{ status: WorkspaceTaskStatus; label: string; hint: string }> = [
  { status: 'backlog', label: 'Vibe Sparks', hint: 'Ý tưởng & Open Bounties' },
  { status: 'in_progress', label: 'In Research', hint: 'Mode A / Paired Pod' },
  { status: 'gate2_review', label: 'Gate 2 Review', hint: 'Chờ kiểm định R(n) ≥ 0.85' },
  { status: 'done', label: 'Done', hint: 'Đã nghiệm thu / xuất bản' },
];

export function WorkspaceTasksPage() {
  const { selectedDomainId } = useDomains();
  const queryClient = useQueryClient();

  const [bountyOnly, setBountyOnly] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<WorkspaceTaskStatus | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicId, setTopicId] = useState('');
  const [taskType, setTaskType] = useState<WorkspaceTaskType>('vibe_spark');
  const [priority, setPriority] = useState<WorkspaceTaskPriority>('medium');
  const [assigneeHuman, setAssigneeHuman] = useState('');
  const [assigneeAiId, setAssigneeAiId] = useState('');
  const [isBounty, setIsBounty] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['ws-tasks', selectedDomainId],
    queryFn: () => fetchResearchTasks(selectedDomainId),
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['ws-topics', selectedDomainId],
    queryFn: () => fetchResearchTopics(selectedDomainId),
  });

  const { data: aiAgents = [] } = useQuery({
    queryKey: ['ws-ai-agents', selectedDomainId],
    queryFn: () => fetchResearcherAiAgents(selectedDomainId),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const chosenAi = aiAgents.find((a) => a.id === assigneeAiId);
      return createResearchTask({
        domain_id: selectedDomainId !== 'all' ? selectedDomainId : null,
        topic_id: topicId || null,
        title: title.trim(),
        description: description.trim() || null,
        task_type: taskType,
        status: 'backlog',
        priority,
        assignee_human_name: isBounty ? 'Open Bounty' : assigneeHuman.trim() || null,
        assignee_ai_name: chosenAi?.agent_name || null,
        assignee_ai_id: chosenAi?.id || null,
        is_bounty: isBounty,
        due_date: null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ws-tasks'] });
      toast.success('Đã tạo nhiệm vụ nghiên cứu mới');
      setIsAdding(false);
      setTitle('');
      setDescription('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkspaceTaskStatus }) =>
      updateResearchTaskStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['ws-tasks', selectedDomainId] });
      const previous = queryClient.getQueryData<ResearchTask[]>(['ws-tasks', selectedDomainId]);
      queryClient.setQueryData<ResearchTask[]>(
        ['ws-tasks', selectedDomainId],
        (old) =>
          (old || []).map((t) =>
            t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t
          )
      );
      return { previous };
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['ws-tasks', selectedDomainId], context.previous);
      }
      toast.error(err.message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['ws-tasks'] });
    },
  });

  const handleDropToColumn = (targetStatus: WorkspaceTaskStatus, droppedId?: string) => {
    const taskId = droppedId || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverColumn(null);
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;
    moveMutation.mutate({ id: taskId, status: targetStatus });
  };

  const filteredTasks = useMemo(
    () => (bountyOnly ? tasks.filter((t) => t.is_bounty) : tasks),
    [tasks, bountyOnly]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="p-6 max-w-[1520px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            Nhiệm vụ &amp; Research Bounties
          </h1>
          <p className="text-sm text-muted mt-1">
            Phân bổ đầu việc linh hoạt giữa Human Researchers và Personal AI Researchers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBountyOnly((v) => !v)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
              bountyOnly
                ? 'border-foreground bg-foreground text-canvas'
                : 'border-border bg-surface text-muted hover:text-foreground'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
            Chỉ hiện Open Bounties
          </button>

          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-canvas hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Tạo Nhiệm vụ
          </button>
        </div>
      </div>

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-surface p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Giao Nhiệm Vụ / Mở Research Bounty</h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-1 text-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">Tên nhiệm vụ *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Chạy benchmark độ trễ MCP bridge..."
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Đề tài liên kết</label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="">— Không gắn đề tài —</option>
                {topics.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Loại hình</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as WorkspaceTaskType)}
                className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="vibe_spark">Vibe Spark</option>
                <option value="formal_proof">Formal Proof</option>
                <option value="empirical_poc">Empirical PoC</option>
                <option value="benchmark">Benchmark</option>
                <option value="fmea_audit">FMEA Audit</option>
                <option value="publication">Publication</option>
                <option value="return_spark">Return Spark (Loop V2)</option>
                <option value="skill_bounty">Skill Bounty</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Độ ưu tiên</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkspaceTaskPriority)}
                className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Human phụ trách</label>
              <input
                type="text"
                disabled={isBounty}
                value={isBounty ? 'Open Bounty' : assigneeHuman}
                onChange={(e) => setAssigneeHuman(e.target.value)}
                className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Personal AI Agent</label>
              <select
                value={assigneeAiId}
                onChange={(e) => setAssigneeAiId(e.target.value)}
                className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="">— Chưa chọn AI —</option>
                {aiAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.agent_name} ({a.owner_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isBounty}
                onChange={(e) => setIsBounty(e.target.checked)}
                className="rounded border-border"
              />
              <span>Mở thành Open Research Bounty (cho phép thành viên khác tự nhận nhánh)</span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="rounded-lg border border-border px-3.5 py-1.5 text-xs text-muted hover:text-foreground"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-canvas hover:opacity-90"
              >
                Lưu Nhiệm vụ
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 4-Column Kanban */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted">Đang tải Kanban...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col, colIdx) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status);
            const prevCol = COLUMNS[colIdx - 1];
            const nextCol = COLUMNS[colIdx + 1];
            const isOver = dragOverColumn === col.status && draggedTaskId !== null;
            const draggedTask = draggedTaskId
              ? tasks.find((t) => t.id === draggedTaskId)
              : null;
            const showDropHint = isOver && draggedTask && draggedTask.status !== col.status;

            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverColumn !== col.status) {
                    setDragOverColumn(col.status);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverColumn((cur) => (cur === col.status ? null : cur));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const transferId = e.dataTransfer.getData('text/plain');
                  handleDropToColumn(col.status, transferId || undefined);
                }}
                className={cn(
                  'rounded-xl border p-3.5 flex flex-col gap-3 min-h-[360px] transition-colors',
                  showDropHint
                    ? 'border-accent bg-accent-soft/20 ring-1 ring-accent/30'
                    : 'border-border bg-surface/70'
                )}
              >
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div>
                    <div className="text-xs font-semibold text-foreground">{col.label}</div>
                    <div className="text-[11px] text-muted">{col.hint}</div>
                  </div>
                  <span className="rounded-full border border-border bg-canvas px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground">
                    {colTasks.length}
                  </span>
                </div>

                {showDropHint && (
                  <div className="rounded-lg border border-dashed border-accent/60 bg-canvas/70 px-3 py-2 text-center text-[11px] font-medium text-accent">
                    Thả nhiệm vụ vào {col.label}
                  </div>
                )}

                <div className="space-y-2.5 flex-1">
                  {colTasks.map((task) => {
                    const isDragging = draggedTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedTaskId(task.id);
                          e.dataTransfer.setData('text/plain', task.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverColumn(null);
                        }}
                        className={cn(
                          'rounded-lg border border-border bg-canvas p-3 space-y-2 cursor-grab active:cursor-grabbing transition-opacity hover:border-border-hover',
                          isDragging && 'opacity-45'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-muted/70 shrink-0" />
                            <span className="rounded border border-border bg-subtle px-1.5 py-0.5 text-[10px] text-muted">
                              {task.task_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {task.is_bounty && (
                              <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                Bounty
                              </span>
                            )}
                            <span className="text-[10px] uppercase text-muted">{task.priority}</span>
                          </div>
                        </div>

                        <h3 className="text-xs font-semibold text-foreground leading-snug">
                          {task.title}
                        </h3>

                        {task.description && (
                          <p className="text-[11px] text-muted line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60 text-[11px] text-muted">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            {task.assignee_human_name && (
                              <span className="inline-flex items-center gap-1 truncate">
                                <User className="w-3 h-3 shrink-0" />
                                {task.assignee_human_name}
                              </span>
                            )}
                            {task.assignee_ai_name && (
                              <span className="inline-flex items-center gap-1 text-foreground truncate">
                                <Bot className="w-3 h-3 shrink-0" />
                                {task.assignee_ai_name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {prevCol && (
                              <button
                                type="button"
                                onClick={() =>
                                  moveMutation.mutate({ id: task.id, status: prevCol.status })
                                }
                                className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted hover:text-foreground hover:bg-subtle"
                                title={`Lùi về ${prevCol.label}`}
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {nextCol && (
                              <button
                                type="button"
                                onClick={() =>
                                  moveMutation.mutate({ id: task.id, status: nextCol.status })
                                }
                                className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-subtle"
                                title={`Chuyển sang ${nextCol.label}`}
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
