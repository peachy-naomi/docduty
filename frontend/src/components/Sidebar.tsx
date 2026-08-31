'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getMe, getToken, clearToken } from '@/lib/api';
import ThemeToggle from './ThemeToggle';

const NAV_GROUPS = [
  {
    label: 'Main',
    links: [
      { href: '/chat', label: 'Ask DocDuty', icon: 'chat' },
      { href: '/dashboard', label: 'Overview', icon: 'home' },
    ],
  },
  {
    label: 'Work',
    links: [
      { href: '/documents', label: 'Documents', icon: 'doc' },
      { href: '/calculators', label: 'Calculators', icon: 'calc' },
      { href: '/deadlines', label: 'Deadlines', icon: 'bell' },
      { href: '/clients', label: 'Clients', icon: 'users' },
    ],
  },
  {
    label: 'Account',
    links: [
      { href: '/profile', label: 'Profile', icon: 'user' },
    ],
  },
];

function Icon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    home: <><rect x="3" y="10" width="18" height="11" rx="1" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" /></>,
    chat: <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.5 0-2.91-.32-4.15-.89L3 20l1.05-3.15A7.94 7.94 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
    doc: <><path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6l5 5v13a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z" /><path strokeLinecap="round" d="M13 2v6h6" /></>,
    calc: <><rect x="4" y="2" width="16" height="20" rx="2" /><path strokeLinecap="round" d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01" /></>,
    bell: <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    users: <><path strokeLinecap="round" strokeLinejoin="round" d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1" /><circle cx="9" cy="7" r="4" /><path strokeLinecap="round" d="M23 20v-1a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path strokeLinecap="round" d="M4 20c0-4 4-6 8-6s8 2 8 6" /></>,
    shield: <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  };
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      {icons[name]}
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoggedIn(!!getToken());
  }, [pathname]);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, enabled: mounted && loggedIn });

  const hideOn = ['/', '/login', '/signup', '/verify-email'];
  if (!mounted || hideOn.includes(pathname) || pathname.startsWith('/pay/') || pathname.startsWith('/chat') || pathname.startsWith('/admin') || !loggedIn) return null;

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--surface-border)' }}
        aria-label="Open menu"
      >
        <svg className="w-4 h-4" fill="none" stroke="var(--text-primary)" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setMobileOpen(false)} />
          <SidebarContent
            me={me}
            pathname={pathname}
            onLogout={handleLogout}
            onNavigate={() => setMobileOpen(false)}
            closable
            onClose={() => setMobileOpen(false)}
          />
        </div>
      )}

      <aside className="hidden md:block w-60 shrink-0 h-screen sticky top-0">
        <SidebarContent me={me} pathname={pathname} onLogout={handleLogout} />
      </aside>
    </>
  );
}

function SidebarContent({
  me,
  pathname,
  onLogout,
  onNavigate,
  closable,
  onClose,
}: {
  me: any;
  pathname: string;
  onLogout: () => void;
  onNavigate?: () => void;
  closable?: boolean;
  onClose?: () => void;
}) {
  return (
    <div
      className={`h-full flex flex-col p-4 ${closable ? 'absolute right-0 top-0 w-64' : 'w-60'}`}
      style={{ background: 'var(--bg-elevated)', borderRight: '1px solid var(--surface-border)' }}
    >
      <div className="flex items-center justify-between mb-6 px-2">
        <span className="font-display font-bold text-lg" style={{ color: 'var(--primary)' }}>DocDuty</span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {closable && (
            <button onClick={onClose} aria-label="Close menu">
              <svg className="w-5 h-5" fill="none" stroke="var(--text-primary)" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-1.5" style={{ color: 'var(--text-faint)' }}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: pathname === link.href ? 'var(--primary)' : 'var(--text-muted)',
                    background: pathname === link.href ? 'var(--surface-subtle)' : 'transparent',
                  }}
                >
                  <Icon name={link.icon} />
                  {link.label}
                </Link>
              ))}
              {group.label === 'Account' && me?.is_admin && (
                <Link
                  href="/admin"
                  onClick={onNavigate}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: pathname === '/admin' ? 'var(--primary)' : 'var(--text-muted)',
                    background: pathname === '/admin' ? 'var(--surface-subtle)' : 'transparent',
                  }}
                >
                  <Icon name="shield" />
                  Admin
                </Link>
              )}
            </div>
          </div>
        ))}
      </nav>

      <button
        onClick={onLogout}
        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium mt-4"
        style={{ color: 'var(--danger)' }}
      >
        Log out
      </button>
    </div>
  );
}
