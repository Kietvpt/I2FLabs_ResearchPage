# Domain: auth_and_access_control (Metabolic Cloud & IAM)

## Context
Quản trị vòng đời danh tính, phiên xác thực người dùng, bảo vệ các tuyến đường Admin, và phân quyền quản trị theo tài khoản đối với 5 Đại phân vùng nghiên cứu chiến lược viện I2FLabs.

## Bounded Context
- **Owns:**
  - Đăng nhập/Đăng xuất qua Supabase Authentication.
  - Route guard kiểm soát quyền truy cập trang quản trị (`ProtectedRoute`).
  - Cơ chế chọn và phân định miền nghiên cứu của từng tài khoản (`DomainContext`).
- **Depends On:**
  - `core_platform` (`supabase.auth`).
- **Exposes:**
  - `DomainContext` và hook `useDomainContext()`.
  - Component `ProtectedRoute`.

## Tech Stack
- **Security:** Supabase GoTrue Auth, Row Level Security (RLS)
- **Key Files:** `src/features/auth/ProtectedRoute.tsx`, `src/context/DomainContext.tsx`
