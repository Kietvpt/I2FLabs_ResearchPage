# Domain: admin_research_studio (Presentation Sensory - Studio)

## Context
Không gian làm việc và quản trị học thuật dành cho Admin và Thành viên nghiên cứu của viện I2FLabs. Thiết kế theo trường phái tối giản nghiêm cẩn của Google DeepMind (austere monochrome), tuyệt đối loại bỏ các màu sắc AI hào nhoáng rườm rà.

## Bounded Context
- **Owns:**
  - `AdminDashboardPage`: Bảng điều khiển quản trị bài viết, trạng thái xuất bản, bộ lọc theo Miền nghiên cứu.
  - `ReportEditorPage`: Trình soạn thảo Markdown chuyên sâu với Live Preview, phân loại tác giả, tag và slug.
  - `DomainManagementPage`: Quản trị 5 Đại phân vùng viện, phân quyền sở hữu theo tài khoản, bổ nhiệm Trưởng miền (Chair Lead).
  - `DomainSelector`: Dropdown chọn không gian miền nghiên cứu gắn với phiên làm việc của tài khoản.
- **Depends On:**
  - `auth_and_access_control`, `research_knowledge_engine`, `compliance_and_data_integrity`.
- **Exposes:**
  - Các tuyến đường quản trị: `/admin`, `/admin/reports/new`, `/admin/reports/:id/edit`, `/admin/domains`.

## Tech Stack
- **Framework:** React 19, Tailwind CSS, Lucide Icons, SCSS Mixins
- **Key Files:** `src/features/admin/AdminDashboardPage.tsx`, `src/features/admin/ReportEditorPage.tsx`, `src/features/domains/DomainManagementPage.tsx`
