# I2FLabs Research Page

Nền tảng lưu trữ, trình bày và quản lý các báo cáo nghiên cứu đồng sáng tạo giữa con người và AI tại **I2FLabs**, xây dựng bằng **Vite + React + TypeScript + Tailwind CSS + Supabase** và tối ưu triển khai trên **Vercel**.

## Tính năng chính
- **Public Research Library (`/`)**: Thư viện bài báo cáo phong cách *Paper Editorial* (Light/Dark mode), Featured Report, lọc theo danh mục & loại báo cáo (`whitepaper`, `benchmark`, `debate`, `empirical_poc`, `specification`...), tìm kiếm nhanh `Cmd/Ctrl + K`.
- **Academic Reader View (`/reports/:slug`)**: Hỗ trợ Markdown nâng cao (GFM, bảng biểu, Code block copy 1-click, sơ đồ **Mermaid** zoomable, công thức toán **KaTeX**), Sticky TOC, khối **Human–AI Collaboration**, hộp KPI động cho Benchmark/Sandbox/Debate, copy trích dẫn IEEE/BibTeX.
- **Admin CMS (`/admin`)**: Đăng nhập bảo mật bằng Supabase Auth + PostgreSQL RLS, trình soạn thảo Split-Screen CodeMirror + Live Preview, **kéo-thả / `Ctrl+V` upload ảnh** (tự nén WebP), **1-Click Import `.md`** chuẩn frontmatter `.aevum/research/`, quản lý Danh mục & Thư viện Media.

---

## Hướng dẫn Thiết lập & Deploy (4 bước)

### Bước 1: Chạy Migration trên Supabase
1. Mở **Supabase Dashboard** → **SQL Editor**.
2. Sao chép toàn bộ nội dung file [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) và nhấn **Run**.
3. Migration sẽ tự động tạo các bảng (`categories`, `reports`, `tags`, `report_tags`, `media`, `admin_profiles`), chỉ mục Full-Text Search, chính sách bảo mật **RLS**, Storage bucket `report-assets` và 5 danh mục mặc định.

### Bước 2: Tạo tài khoản Admin & Cấp quyền
1. Trong **Supabase Dashboard** → **Authentication** → **Providers** → tắt **Allow new users to sign up** (chỉ cho phép mời/tạo thủ công).
2. Vào **Authentication** → **Users** → **Add user** để tạo tài khoản email/mật khẩu cho Admin, sau đó sao chép `User UID`.
3. Chạy lệnh sau trong **SQL Editor** để cấp quyền quản trị:
   ```sql
   INSERT INTO public.admin_profiles (user_id, display_name, role)
   VALUES ('<PASTE_USER_UID_HERE>', 'I2FLabs Admin', 'admin');
   ```

### Bước 3: Nạp dữ liệu nghiên cứu mẫu từ `.aevum/research/`
Đảm bảo file `.env.local` ở local có đủ `VITE_SUPABASE_URL` và `SUPABASE_SECRET_KEY`, sau đó chạy:
```bash
npm install
npm run seed
```
Lệnh sẽ tự động parse và nạp sẵn 9 bài báo cáo từ `.aevum/research/*.md` lên Supabase.

Chạy thử local:
```bash
npm run dev
```

### Bước 4: Push lên GitHub & Deploy lên Vercel
1. Kiểm tra `git status` để chắc chắn `.env.local` **không** nằm trong danh sách commit, sau đó commit và push lên `https://github.com/Kietvpt/I2FLabs_ResearchPage`:
   ```bash
   git add .
   git commit -m "feat: initial I2FLabs Research Page"
   git push -u origin main
   ```
2. Vào **Vercel** → **Add New Project** → Import repo `Kietvpt/I2FLabs_ResearchPage` (Framework Preset: **Vite**).
3. Trong mục **Environment Variables**, khai báo 2 biến sau *(KHÔNG đưa `SUPABASE_SECRET_KEY` lên biến `VITE_`)*:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Nhấn **Deploy**. File `vercel.json` đã cấu hình sẵn SPA routing rewrite và cache/security headers.
