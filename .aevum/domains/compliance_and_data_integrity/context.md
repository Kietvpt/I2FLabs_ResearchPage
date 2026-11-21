# Domain: compliance_and_data_integrity (Immune Defense & Zero-Trust)

## Context
Cơ quan bảo vệ ranh giới và tính toàn vẹn dữ liệu của Viện Nghiên cứu I2FLabs. Thực thi nghiêm ngặt nguyên tắc "No FOMO / Zero Mock Fallback" — toàn bộ dữ liệu phải tải và lưu trực tiếp từ cơ sở dữ liệu Supabase, loại bỏ triệt để các dữ liệu ảo.

## Bounded Context
- **Owns:**
  - Các kịch bản Migration SQL của Supabase (`supabase/migrations/001` - `005`).
  - Kiểm định toàn vẹn dữ liệu trong MCP Tools và Frontend API.
  - Quản trị bảo mật upload tài sản Media (`report-assets` bucket).
- **Depends On:**
  - `core_platform` (`supabase`).
- **Exposes:**
  - SQL Schema Definitions và Migration History.
  - Xử lý lỗi cơ sở dữ liệu tường minh (không nuốt lỗi).

## Tech Stack
- **Database:** PostgreSQL (Supabase), PostgREST, Row-Level Security
- **Key Files:** `supabase/migrations/*.sql`, `src/features/reports/api.ts`
