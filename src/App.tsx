import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { HomePage } from '@/features/reports/HomePage';
import { ReportDetailPage } from '@/features/reports/ReportDetailPage';

// Code-split Auth & Admin CMS chunks so public readers never download CodeMirror/Admin bundles
const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const ProtectedRoute = lazy(() =>
  import('@/features/auth/ProtectedRoute').then((m) => ({ default: m.ProtectedRoute }))
);
const AdminLayout = lazy(() =>
  import('@/features/admin/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);
const AdminDashboardPage = lazy(() =>
  import('@/features/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const ReportEditorPage = lazy(() =>
  import('@/features/admin/ReportEditorPage').then((m) => ({ default: m.ReportEditorPage }))
);
const MediaLibraryPage = lazy(() =>
  import('@/features/admin/MediaLibraryPage').then((m) => ({ default: m.MediaLibraryPage }))
);
const DomainManagementPage = lazy(() =>
  import('@/features/domains/DomainManagementPage').then((m) => ({
    default: m.DomainManagementPage,
  }))
);

function RouteFallback() {
  return (
    <div className="min-h-screen bg-canvas text-foreground flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-accent" />
      <p className="text-sm text-muted">Đang tải...</p>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public Research Library & Reader */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="reports/:slug" element={<ReportDetailPage />} />
        </Route>

        {/* Admin Auth */}
        <Route path="admin/login" element={<LoginPage />} />

        {/* Protected Admin CMS */}
        <Route path="admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="reports/new" element={<ReportEditorPage />} />
            <Route path="reports/:id/edit" element={<ReportEditorPage />} />
            <Route path="domains" element={<DomainManagementPage />} />
            <Route path="categories" element={<Navigate to="/admin/domains" replace />} />
            <Route path="media" element={<MediaLibraryPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
