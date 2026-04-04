import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useHasCapability, useEffectiveCapabilities } from './hooks';
import AdminSidebar from './AdminSidebar';
import UsersPanel from './panels/UsersPanel';
import GroupsPanel from './panels/GroupsPanel';
import RolesPanel from './panels/RolesPanel';
import ConfigOverridesPanel from './panels/ConfigOverridesPanel';
import GrantsPanel from './panels/GrantsPanel';

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

  return (
    <div className="flex h-full">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Routes>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<UsersPanel />} />
          <Route path="groups" element={<GroupsPanel />} />
          <Route path="roles" element={<RolesPanel />} />
          <Route path="config" element={<ConfigOverridesPanel />} />
          <Route path="grants" element={<GrantsPanel />} />
          <Route path="*" element={<Navigate to="users" replace />} />
        </Routes>
      </main>
    </div>
  );
}
