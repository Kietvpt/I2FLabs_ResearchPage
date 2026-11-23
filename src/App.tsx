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
const SocialPlaygroundLayout = lazy(() =>
  import('@/features/foundry/SocialPlaygroundLayout').then((m) => ({
    default: m.SocialPlaygroundLayout,
  }))
);
const BoardWorkspaceLayout = lazy(() =>
  import('@/features/workspace/BoardWorkspaceLayout').then((m) => ({
    default: m.BoardWorkspaceLayout,
  }))
);
const AdminLauncherPage = lazy(() =>
  import('@/features/admin/AdminLauncherPage').then((m) => ({ default: m.AdminLauncherPage }))
);
const AdminDashboardPage = lazy(() =>
  import('@/features/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const ResourceHubPage = lazy(() =>
  import('@/features/resources/ResourceHubPage').then((m) => ({ default: m.ResourceHubPage }))
);
const WorkspaceTasksPage = lazy(() =>
  import('@/features/workspace/WorkspaceTasksPage').then((m) => ({
    default: m.WorkspaceTasksPage,
  }))
);
const WorkspaceResearchersPage = lazy(() =>
  import('@/features/workspace/WorkspaceResearchersPage').then((m) => ({
    default: m.WorkspaceResearchersPage,
  }))
);
const FoundryListPage = lazy(() =>
  import('@/features/foundry/FoundryListPage').then((m) => ({
    default: m.FoundryListPage,
  }))
);
const FoundryCockpitPage = lazy(() =>
  import('@/features/foundry/FoundryCockpitPage').then((m) => ({
    default: m.FoundryCockpitPage,
  }))
);
const ReportEditorPage = lazy(() =>
  import('@/features/admin/ReportEditorPage').then((m) => ({ default: m.ReportEditorPage }))
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

        {/* Protected Admin Research OS (Distinct Purpose-Built Workspace Layouts) */}
        <Route path="admin" element={<ProtectedRoute />}>
          {/* 1. Research Playground: Social Dev Community Layout (No Admin Sidebar) */}
          <Route element={<SocialPlaygroundLayout />}>
            <Route path="forge" element={<FoundryListPage />} />
            <Route path="forge/:slug" element={<FoundryCockpitPage />} />
          </Route>

          {/* 2. Task & Bounties Kanban: Full-Width Board Layout (No Sidebar) */}
          <Route element={<BoardWorkspaceLayout />}>
            <Route path="tasks" element={<WorkspaceTasksPage />} />
          </Route>

          {/* 3. App Launcher (No Sidebar at /admin) & Editorial CMS/Directory Sidebar Layout */}
          <Route element={<AdminLayout />}>
            <Route index element={<AdminLauncherPage />} />
            <Route path="reports" element={<AdminDashboardPage />} />
            <Route path="reports/new" element={<ReportEditorPage />} />
            <Route path="reports/:id/edit" element={<ReportEditorPage />} />
            <Route path="researchers" element={<WorkspaceResearchersPage />} />
            <Route path="resources" element={<ResourceHubPage />} />
            {/* Legacy route redirects to keep bookmarks working */}
            <Route path="overview" element={<Navigate to="/admin" replace />} />
            <Route path="topics" element={<Navigate to="/admin/forge" replace />} />
            <Route path="products" element={<Navigate to="/admin/reports" replace />} />
            <Route path="domains" element={<Navigate to="/admin/resources" replace />} />
            <Route path="categories" element={<Navigate to="/admin/resources" replace />} />
            <Route path="media" element={<Navigate to="/admin/resources?tab=media" replace />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
