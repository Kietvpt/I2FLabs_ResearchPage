# Domain: core_platform (Circulatory Kernel)

## Context
Miền nền tảng hạt nhân chịu trách nhiệm kết nối hạ tầng cơ sở dữ liệu Supabase, định nghĩa hệ thống Types phân vùng chuẩn xác, và cung cấp các quy chuẩn thiết kế giao diện (Design Tokens, SCSS Mixins, Monochrome Variables theo trường phái Google DeepMind).

## Bounded Context
- **Owns:**
  - `src/lib/supabase.ts`: Khởi tạo Supabase Client, error formatting, connection status.
  - `src/types/*`: Phân vùng type an toàn (`database/`, `reports/`, `domains/`, `admin/`, `auth/`).
  - `src/styles/*`: Hệ thống CSS Tokens, mixins, typography và patterns tối giản.
- **Depends On:**
  - `@supabase/supabase-js`, `typescript`, `tailwindcss`, `sass`.
- **Exposes:**
  - Singleton `supabase` client & `isSupabaseConfigured`.
  - Canonical TypeScript contracts cho toàn bộ ứng dụng.
  - Global styles tokens tại `src/styles/index.scss`.

## Tech Stack
- **Language:** TypeScript 5.8+
- **Key Files:** `src/lib/supabase.ts`, `src/types/index.ts`, `src/styles/index.scss`
- **Entry Points:** `src/main.tsx`, `src/App.tsx`
