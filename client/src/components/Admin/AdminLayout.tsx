import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ShieldOff, ArrowLeft, ChevronRight } from 'lucide-react';
import { useHasCapability, useEffectiveCapabilities } from './hooks';
import AdminSidebar from './AdminSidebar';
import UsersPanel from './panels/UsersPanel';
import StatsPanel from './panels/StatsPanel';
import GroupsPanel from './panels/GroupsPanel';
import RolesPanel from './panels/RolesPanel';
import ConfigOverridesPanel from './panels/ConfigOverridesPanel';
import GrantsPanel from './panels/GrantsPanel';

const TAB_LABELS: Record<string, string> = {
  users: 'Users',
  stats: 'Stats',
  groups: 'Groups',
  roles: 'Roles',
  config: 'Config',
  grants: 'Grants',
};

export default function AdminLayout() {
  const { isLoading } = useEffectiveCapabilities();
  const hasAccess = useHasCapability('access:admin');

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-text-secondary border-t-transparent" />
          Loading admin panel…
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <ShieldOff className="h-12 w-12 text-text-secondary" />
        <h1 className="text-xl font-semibold text-text-primary">Access Denied</h1>
        <p className="text-sm text-text-secondary">
          You do not have permission to access the admin panel.
        </p>
        <Link
          to="/c/new"
          className="text-sm font-medium text-text-primary underline hover:text-text-secondary"
        >
          Go back
        </Link>
      </div>
    );
  }

  const location = useLocation();
  const activeTab = location.pathname.split('/').pop() || 'users';
  const activeLabel = TAB_LABELS[activeTab] || 'Admin';

  return (
    <div className="flex h-full">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 border-b border-border-light bg-surface-primary px-6 py-3">
          <Link
            to="/c/new"
            className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
            aria-label="Back to chat"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Chat
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
          <span className="text-sm text-text-secondary">Admin</span>
          <ChevronRight className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
          <span className="text-sm font-medium text-text-primary">{activeLabel}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<UsersPanel />} />
            <Route path="stats" element={<StatsPanel />} />
            <Route path="groups" element={<GroupsPanel />} />
            <Route path="roles" element={<RolesPanel />} />
            <Route path="config" element={<ConfigOverridesPanel />} />
            <Route path="grants" element={<GrantsPanel />} />
            <Route path="*" element={<Navigate to="users" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
