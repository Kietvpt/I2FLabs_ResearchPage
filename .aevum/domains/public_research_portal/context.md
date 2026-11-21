# Domain: public_research_portal (Presentation Sensory - Public)

## Context
Không gian hiển thị công khai cho độc giả, nhà khoa học và cộng đồng công nghệ, cung cấp trải nghiệm đọc học thuật tối giản, tra cứu 5 Đại phân vùng nghiên cứu chiến lược, đọc các bài Whitepaper, Benchmark và biên bản Tranh biện đa chiều (Dialectic Debates).

## Bounded Context
- **Owns:**
  - `HomePage`: Trang chủ viện nghiên cứu, danh sách bài viết nổi bật, bộ lọc phân loại.
  - `ReportDetailPage`: Giao diện đọc bài viết với TOC (mục lục), công thức KaTeX, tác giả AI/Human và reading time.
  - `PublicLayout`: Header, Navigation và Footer theo quy chuẩn nhận diện viện I2FLabs.
- **Depends On:**
  - `research_knowledge_engine`, `core_platform`.
- **Exposes:**
  - Các tuyến đường công khai: `/`, `/reports/:slug`.

## Tech Stack
- **Framework:** React 19, React Router v7, Tailwind CSS, KaTeX
- **Key Files:** `src/features/reports/HomePage.tsx`, `src/features/reports/ReportDetailPage.tsx`
