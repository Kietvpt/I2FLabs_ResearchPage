import type { Category, ReportWithRelations } from '@/types/database';
import { DEFAULT_RESEARCH_DOMAINS } from '@/features/domains/api';

export const DEMO_CATEGORIES: Category[] = [
  {
    id: 'demo-cat-ai-systems',
    name: 'AI Systems',
    slug: 'ai-systems',
    description: 'Kiến trúc tác tử, cộng sinh Human–AI và điều phối đa mô hình.',
    color: '#4F46E5',
    sort_order: 1,
    created_at: '2026-09-20T00:00:00Z',
  },
  {
    id: 'demo-cat-benchmarks',
    name: 'Benchmarks & Telemetry',
    slug: 'benchmarks-telemetry',
    description: 'Đo kiểm hiệu năng, độ trễ và dữ liệu thực nghiệm định lượng.',
    color: '#059669',
    sort_order: 2,
    created_at: '2026-09-20T00:00:00Z',
  },
  {
    id: 'demo-cat-flow-ux',
    name: 'Flow & Cognitive UX',
    slug: 'flow-cognitive-ux',
    description: 'Tối ưu tải nhận thức, trạng thái dòng chảy và giao diện tối giản.',
    color: '#7C3AED',
    sort_order: 3,
    created_at: '2026-09-20T00:00:00Z',
  },
  {
    id: 'demo-cat-architecture',
    name: 'Architecture & Specs',
    slug: 'architecture-specs',
    description: 'Đặc tả kỹ thuật, giao thức tương tác và phân tích đánh đổi.',
    color: '#2563EB',
    sort_order: 4,
    created_at: '2026-09-20T00:00:00Z',
  },
  {
    id: 'demo-cat-dialectic',
    name: 'Dialectic & Research',
    slug: 'dialectic-research',
    description: 'Tranh biện khoa học, phân tích điểm gãy và giả thuyết nền tảng.',
    color: '#D97706',
    sort_order: 5,
    created_at: '2026-09-20T00:00:00Z',
  },
];

export const DEMO_REPORTS: ReportWithRelations[] = [
  {
    id: 'demo-rep-flow-whitepaper',
    title:
      'Tối Ưu Hóa Trạng Thái Dòng Chảy (Flow State) Trong Kỷ Nguyên Trí Tuệ Nhân Tạo',
    slug: 'toi-uu-hoa-trang-thai-dong-chay-flow-state-trong-ky-nguyen-ai',
    summary:
      'Mô hình cộng tác cộng sinh Human–AI nhằm giảm tải nhận thức ngoại lai, bảo vệ sự liền mạch tư duy và gia tăng thời lượng Deep Flow thông qua giao thức Aevum Cadence 50/10.',
    cover_image_url: null,
    category_id: 'demo-cat-ai-systems',
    category: DEMO_CATEGORIES[0],
    domain_id: 'domain-cong-nghe-ai',
    domain: DEFAULT_RESEARCH_DOMAINS[0],
    report_type: 'whitepaper',
    status: 'published',
    is_featured: true,
    version: '1.0.0',
    reading_time: 8,
    human_authors: [
      { name: 'I2FLabs Research Team', role: 'Lead Architect' },
    ],
    ai_contributors: [
      {
        agent_name: 'An',
        role: 'Lead Synthesizer',
        contribution: 'Tổng hợp phương pháp luận AID & viết báo cáo',
      },
      {
        agent_name: 'Zenith',
        role: 'Telemetry Engineer',
        contribution: 'Đo kiểm thực nghiệm 40 kỹ sư phần mềm',
      },
      {
        agent_name: 'Luna',
        role: 'Cognitive UX Designer',
        contribution: 'Giả thuyết Minimalist Workspace',
      },
      {
        agent_name: 'Vidus',
        role: 'System Architect',
        contribution: 'Phản biện Human-in-the-Loop Gate',
      },
    ],
    model_used: ['Gemini 2.5 Pro', 'Claude 3.7 Sonnet'],
    collaboration_mode: 'co_authored',
    source_metadata: {
      mission_id: 'mis_flow_state_seed',
      author_persona: 'An',
      benchmark_metrics: {
        'Flow Entry Time': '3.8 phút (nhanh hơn 4.8x)',
        'Context Switches / Giờ': '0.8 lần (giảm 90.8%)',
        'Deep Flow Duration': '51.2 phút (tăng 2.6x)',
        'Cognitive Fatigue': '2.6 / 10',
      },
    },
    tags: [
      { id: 't1', name: 'flow_state', slug: 'flow-state' },
      { id: 't2', name: 'human_ai_symbiosis', slug: 'human-ai-symbiosis' },
      { id: 't3', name: 'cognitive_load', slug: 'cognitive-load' },
      { id: 't4', name: 'protocol', slug: 'protocol' },
    ],
    published_at: '2026-09-23T09:00:00Z',
    created_by: null,
    created_at: '2026-09-23T09:00:00Z',
    updated_at: '2026-09-23T09:00:00Z',
    content_md: `## 1. Tóm tắt (Abstract)

Trạng thái Dòng chảy (**Flow State**) là trạng thái tâm lý đỉnh cao khi con người hoàn toàn đắm chìm vào công việc với sự tập trung cao độ, khả năng sáng tạo vượt bậc và cảm giác thỏa mãn nội tại. Tuy nhiên, sự bùng nổ của các mô hình trí tuệ nhân tạo tạo sinh đang tạo ra một nghịch lý: khả năng tiếp cận thông tin tăng theo hàm mũ nhưng sự liền mạch nhận thức lại bị phân mảnh nghiêm trọng do hiện tượng đứt gãy ngữ cảnh liên tục (*Context Switching Fragmentation*).

> 💡 **AI Insight:** Giao tiếp AI dạng Micro-Prompt (dưới 50 từ) tích hợp trực tiếp trong ngữ cảnh làm việc giúp duy trì nhịp tập trung tốt hơn **3.2 lần** so với việc chuyển tab sang Mega-Prompt Web UI rời rạc.

## 2. Phương pháp luận: Chu trình AID Epistemic Cycle

Quy trình nghiên cứu áp dụng **Aevum Iterative Discovery (AID)** qua 4 pha khép kín:

\`\`\`mermaid
graph LR
    P1["1. Discovery<br/>(Thu thập đa nguồn)"] --> P2["2. Formal Hypotheses<br/>(Xây dựng giả thuyết)"]
    P2 --> P3["3. Empirical PoC & Benchmark<br/>(Thực nghiệm đo kiểm)"]
    P3 --> P4["4. Dialectic Synthesis<br/>(Tranh biện & Đúc kết)"]
    P4 -.->|Vòng lặp tiến hóa| P1
\`\`\`

## 3. Phương trình Nhận thức Toán học

Tổng tải nhận thức của một phiên làm việc được mô hình hóa theo Cognitive Load Theory mở rộng:

$$CL_{Total} = CL_{Intrinsic} + CL_{Extraneous} \\cdot (1 - \\eta_{Aevum}) + CL_{Germane}$$

Trong đó $\\eta_{Aevum} \\in [0.75, 0.90]$ là **Hệ số Hấp thụ Tải Ngoại lai**. Khi $\\eta_{Aevum}$ tiến gần 1, tải nhận thức ngoại lai $CL_{Extraneous}$ suy giảm tiệm cận về 0, giải phóng tài nguyên vỏ não cho $CL_{Germane}$.

**Chỉ số Liền mạch Dòng chảy (Flow Continuity Index — FCI):**

$$FCI = \\frac{T_{deep\\_work}}{T_{total\\_session} + \\sum_{k=1}^{n} (\\Delta t_{switch\\_k} \\cdot \\beta_k)}$$

## 4. Kết quả Đo kiểm Thực nghiệm (n = 40 kỹ sư)

| Chỉ Số Đánh Giá (Metric) | Thủ Công (Solo) | AI Chat Rời Rạc (Web UI) | Aevum Cadence Protocol | Cải Thiện |
| :--- | :--- | :--- | :--- | :--- |
| **Thời gian vào Flow** | 18.4 phút | 12.1 phút | **3.8 phút** | **Nhanh hơn 4.8x** |
| **Mất ngữ cảnh / giờ** | 6.2 lần | 8.7 lần | **0.8 lần** | **Giảm 90.8%** |
| **Thời lượng Flow ($T_{deep}$)** | 28.5 phút | 19.3 phút | **51.2 phút** | **Tăng 2.6x** |
| **Độ trễ phản hồi TB** | 120s | 8.5s | **0.32s** | **Tức thì** |
| **Mệt mỏi nhận thức (1–10)** | 7.8 | 8.4 | **2.6** | **Bền vững vượt trội** |

## 5. Đặc tả Giao thức Aevum Cadence 50/10

\`\`\`ts
export interface CadenceSessionConfig {
  deepWorkMinutes: 50;
  recoveryMinutes: 10;
  maxLatencyMs: 300;
  humanInTheLoopGate: true;
}
\`\`\`

Giao thức yêu cầu mọi tác vụ tự động hóa đều phải đi qua **Human-in-the-Loop Gate** tại mốc tổng kết 10 phút nhằm ngăn ngừa sự tha hóa nhận thức (*Cognitive Atrophy*).`,
  },
  {
    id: 'demo-rep-benchmark-telemetry',
    title: 'Benchmark Telemetry: Đo Độ Trễ Phản Hồi AI & Ngưỡng Đứt Gãy Flow',
    slug: 'benchmark-telemetry-do-do-tre-phan-hoi-ai-va-nguong-dut-gay-flow',
    summary:
      'Phân tích định lượng ngưỡng độ trễ 300ms của MCP Tool Bridge so với giao diện Web Chat truyền thống trong các tác vụ tái cấu trúc mã nguồn phức tạp.',
    cover_image_url: null,
    category_id: 'demo-cat-benchmarks',
    category: DEMO_CATEGORIES[1],
    domain_id: 'domain-cong-nghe-ai',
    domain: DEFAULT_RESEARCH_DOMAINS[0],
    report_type: 'benchmark',
    status: 'published',
    is_featured: false,
    version: '1.2.0',
    reading_time: 6,
    human_authors: [{ name: 'I2FLabs Telemetry', role: 'Benchmark Lead' }],
    ai_contributors: [
      {
        agent_name: 'Zenith',
        role: 'Performance Analyst',
        contribution: 'Thu thập & phân tích dữ liệu sandbox',
      },
    ],
    model_used: ['Gemini 2.5 Pro'],
    collaboration_mode: 'co_authored',
    source_metadata: {
      benchmark_metrics: {
        'P50 Latency': '240 ms',
        'P95 Latency': '320 ms',
        'Flow Drop Threshold': '> 1,200 ms',
        'Sample Size': '40 Engineers / 120 Sessions',
      },
      sandbox_details: {
        Runtime: 'Node 22 + Vite 6',
        Bridge: 'Aevos MCP Local Socket',
        Metric_Collector: 'Keystroke & Window Focus Telemetry',
      },
    },
    tags: [
      { id: 't5', name: 'benchmark', slug: 'benchmark' },
      { id: 't6', name: 'telemetry', slug: 'telemetry' },
      { id: 't7', name: 'latency', slug: 'latency' },
    ],
    published_at: '2026-09-21T14:30:00Z',
    created_by: null,
    created_at: '2026-09-21T14:30:00Z',
    updated_at: '2026-09-21T14:30:00Z',
    content_md: `## 1. Mục tiêu Đo kiểm

Xác định chính xác ngưỡng độ trễ (latency threshold) mà tại đó não bộ kỹ sư bắt đầu thoát khỏi vùng tập trung sâu để chuyển sang hành vi kiểm tra tab phụ.

## 2. Thiết lập Sandbox

Các phiên đo kiểm được thực thi trong môi trường cô lập, ghi nhận thời điểm mất focus cửa sổ IDE và thời gian phục hồi thao tác gõ phím.

| Cấu hình tương tác | P50 Latency | P95 Latency | Tỷ lệ thoát Flow trong 15 phút |
| :--- | :--- | :--- | :--- |
| Local MCP Bridge | **240ms** | **320ms** | **4.2%** |
| IDE Inline Chat | 1,450ms | 2,800ms | 21.5% |
| External Web Chat | 4,200ms | 8,500ms | 64.0% |

## 3. Kết luận Kỹ thuật

Duy trì phản hồi dưới ngưỡng **300ms** cho các thao tác tra cứu ngữ cảnh giúp giữ tỷ lệ duy trì dòng chảy trên **95%**.`,
  },
  {
    id: 'demo-rep-debate-agency',
    title: 'Tranh Biện Kiến Trúc: Quyền Tự Chủ Con Người vs. Tự Động Hóa AI',
    slug: 'tranh-bien-kien-truc-quyen-tu-chu-con-nguoi-vs-tu-dong-hoa-ai',
    summary:
      'Phiên tranh biện đa chiều giữa Vidus và An về ranh giới giữa tốc độ tự động hóa tác tử AI và rủi ro suy giảm tư duy phản biện của kỹ sư.',
    cover_image_url: null,
    category_id: 'demo-cat-dialectic',
    category: DEMO_CATEGORIES[4],
    domain_id: 'domain-kinh-te-phap-che',
    domain: DEFAULT_RESEARCH_DOMAINS[4],
    report_type: 'debate',
    status: 'published',
    is_featured: false,
    version: '1.0.0',
    reading_time: 5,
    human_authors: [{ name: 'Master / I2FLabs', role: 'Decision Chair' }],
    ai_contributors: [
      {
        agent_name: 'Vidus',
        role: 'Architectural Guard',
        contribution: 'Bảo vệ luận điểm Human-in-the-Loop Gate',
      },
      {
        agent_name: 'An',
        role: 'Workflow Strategist',
        contribution: 'Đề xuất cơ chế ủy quyền có kiểm soát',
      },
    ],
    model_used: ['Claude 3.7 Sonnet', 'Gemini 2.5 Pro'],
    collaboration_mode: 'co_authored',
    source_metadata: {
      debate_details: {
        topic_debated: 'Mức độ tự động hóa tối ưu trong quy trình nghiên cứu & kỹ thuật',
        personas: ['Vidus (Architectural Guard)', 'An (Workflow Strategist)'],
        consensus_percent: 92,
      },
    },
    tags: [
      { id: 't8', name: 'debate', slug: 'debate' },
      { id: 't9', name: 'human_agency', slug: 'human-agency' },
      { id: 't10', name: 'governance', slug: 'governance' },
    ],
    published_at: '2026-09-19T11:00:00Z',
    created_by: null,
    created_at: '2026-09-19T11:00:00Z',
    updated_at: '2026-09-19T11:00:00Z',
    content_md: `## 1. Bối cảnh Tranh biện

Khi các hệ thống Multi-Agent có khả năng tự động viết mã, chạy thử nghiệm và đề xuất kiến trúc, câu hỏi cốt lõi đặt ra là: **Đâu là điểm dừng để con người không trở thành người phê duyệt mù quáng?**

## 2. Hai Luận điểm Cốt lõi

- **Luận điểm A (An — Tự động hóa theo nhịp):** Ủy quyền toàn bộ tác vụ lặp lại (scaffold, tổng hợp tài liệu, kiểm thử hồi quy) để con người dồn 100% năng lượng cho thiết kế hệ thống.
- **Luận điểm B (Vidus — Hàng rào kiến trúc):** Bất kỳ thay đổi nào tác động đến Data Schema, bảo mật hoặc hợp đồng giao diện bắt buộc phải có **Human-in-the-Loop Gate** tường minh.

## 3. Đồng thuận (92% Consensus)

\`\`\`mermaid
flowchart LR
    A[AI Swarm thực thi song song] --> B{Cổng phê duyệt Con người}
    B -->|Đạt chuẩn kiến trúc| C[Hợp nhất vào Mainline]
    B -->|Cần điều chỉnh| A
\`\`\`

> 💡 **AI Insight:** Tự động hóa tối đa ở khâu khám phá và tổng hợp, nhưng giữ tuyệt đối quyền phán quyết kiến trúc trong tay con người là công thức bền vững nhất.`,
  },
];
