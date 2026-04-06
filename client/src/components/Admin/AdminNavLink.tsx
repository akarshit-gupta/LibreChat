import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { TooltipAnchor } from '@librechat/client';
import { useHasCapability } from './hooks';

const isAdminEnabled = import.meta.env.VITE_ENABLE_ADMIN_PANEL === 'true';

export default function AdminNavLink() {
  const hasAccess = useHasCapability('access:admin');

  if (!isAdminEnabled || !hasAccess) {
    return null;
  }

  return (
    <TooltipAnchor
      side="right"
      description="Admin Panel"
      render={
        <Link
          to="/d/admin"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label="Admin Panel"
        >
          <Shield className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
    />
  );
}
