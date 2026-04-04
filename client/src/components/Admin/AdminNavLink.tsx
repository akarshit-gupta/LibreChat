import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useHasCapability } from './hooks';

const isAdminEnabled = import.meta.env.VITE_ENABLE_ADMIN_PANEL === 'true';

export default function AdminNavLink() {
  const hasAccess = useHasCapability('access:admin');

  if (!isAdminEnabled || !hasAccess) {
    return null;
  }

  return (
    <Link
      to="/d/admin"
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
      aria-label="Admin Panel"
    >
      <Shield className="h-4 w-4" />
      <span>Admin</span>
    </Link>
  );
}
