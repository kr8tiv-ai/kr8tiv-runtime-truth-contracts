'use client';

// ============================================================================
// Dashboard Sidebar — Fixed left navigation for the dashboard.
// ============================================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';

const TIER_COLORS: Record<string, string> = {
  free: 'bg-white/10 text-white/70',
  hatchling: 'bg-cyan/10 text-cyan border border-cyan/20',
  elder: 'bg-magenta/10 text-magenta border border-magenta/20',
  hero: 'bg-gold/10 text-gold border border-gold/20',
};

// SVG icon paths — clean, soulful line art that matches the dark premium theme
const ICONS: Record<string, string> = {
  overview: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
  chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  companion: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197V21',
  soul: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  collection: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  projects: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  progress: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  skills: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  setup: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  health: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  billing: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  refer: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  help: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  settings: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
};

function NavIcon({ name, className }: { name: string; className?: string }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg className={cn('w-[18px] h-[18px] shrink-0', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', iconKey: 'overview' },
  { href: '/dashboard/chat', label: 'Chat', iconKey: 'chat' },
  { href: '/dashboard/companion', label: 'My Companion', iconKey: 'companion' },
  { href: '/dashboard/soul', label: 'Soul', iconKey: 'soul' },
  { href: '/dashboard/collection', label: 'Collection', iconKey: 'collection' },
  { href: '/dashboard/projects', label: 'Projects', iconKey: 'projects' },
  { href: '/dashboard/progress', label: 'Progress', iconKey: 'progress' },
  { href: '/dashboard/skills', label: 'Skills', iconKey: 'skills' },
  { href: '/dashboard/setup', label: 'Setup', iconKey: 'setup' },
  { href: '/dashboard/health', label: 'Health', iconKey: 'health' },
  { href: '/dashboard/billing', label: 'Billing', iconKey: 'billing' },
  { href: '/dashboard/refer', label: 'Refer', iconKey: 'refer' },
  { href: '/dashboard/help', label: 'Help', iconKey: 'help' },
  { href: '/dashboard/settings', label: 'Settings', iconKey: 'settings' },
];

interface DashboardSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function DashboardSidebar({ className, onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const firstName = user?.firstName ?? 'User';
  const initial = firstName.charAt(0).toUpperCase();
  const tier = user?.tier ?? 'free';

  function isActive(href: string): boolean {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        'flex h-full w-[260px] flex-col border-r border-white/10 bg-surface',
        className,
      )}
    >
      {/* User Info */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan/20 text-cyan font-display font-bold text-lg">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {firstName}
          </p>
          <span
            className={cn(
              'mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider',
              TIER_COLORS[tier] ?? TIER_COLORS.free,
            )}
          >
            {tier}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'border-l-2 border-cyan bg-cyan/5 text-cyan'
                      : 'border-l-2 border-transparent text-white/60 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <NavIcon name={item.iconKey} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 transition-colors duration-200 hover:bg-white/5 hover:text-magenta"
        >
          <NavIcon name="logout" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
