# Domain: research_knowledge_engine (Cognitive Reflex)

## Context
Cơ quan xử lý tri thức khoa học, chịu trách nhiệm biên dịch và hiển thị các định dạng nội dung học thuật phức tạp: Markdown GFM, công thức toán học LaTeX (KaTeX), sơ đồ kiến trúc động Mermaid, và danh mục phân loại bài viết (Taxonomy).

## Bounded Context
- **Owns:**
  - CodeMirror Editor tích hợp syntax highlighting và theme tối giản.
  - Bộ renderer toán học KaTeX và sơ đồ Mermaid.
  - Bộ máy tìm kiếm và lọc danh mục báo cáo (`CommandSearch`, filter hooks).
- **Depends On:**
  - `core_platform` (dữ liệu bài viết, styles).
  - `compliance_and_data_integrity` (bảo đảm dữ liệu thật).
- **Exposes:**
  - Các hook truy vấn báo cáo khoa học (`fetchPublishedReports`, `fetchReportBySlug`).
  - UI Components: `CommandSearch`, `MarkdownRenderer`.

## Tech Stack
- **Libraries:** `@codemirror/*`, `react-markdown`, `remark-math`, `rehype-katex`, `mermaid`
- **Key Files:** `src/features/reports/api.ts`, `src/features/reports/CommandSearch.tsx`
