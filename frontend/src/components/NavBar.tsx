'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken, clearToken } from '@/lib/api';
import ThemeToggle from './ThemeToggle';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/documents', label: 'Documents' },
  { href: '/deadlines', label: 'Deadlines' },
  { href: '/clients', label: 'Clients' },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoggedIn(!!getToken());
  }, [pathname]);

  const hideOn = ['/', '/login', '/signup', '/verify-email'];
  if (!mounted || hideOn.includes(pathname) || !loggedIn) return null;

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--surface-border)' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="font-display font-bold text-lg" style={{ color: 'var(--primary)' }}>
            DocDuty
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: pathname === link.href ? 'var(--primary)' : 'var(--text-muted)',
                  background: pathname === link.href ? 'var(--surface-subtle)' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/chat"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg btn-accent"
            >
              Ask DocDuty
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="w-9 h-9 rounded-full flex items-center justify-center md:hidden"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="var(--text-primary)" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link
              href="/profile"
              className="hidden md:flex w-9 h-9 rounded-full items-center justify-center"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}
              aria-label="Profile"
             >
              <svg className="w-4 h-4" fill="none" stroke="var(--text-primary)" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path strokeLinecap="round" d="M4 20c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute right-0 top-0 h-full w-72 p-6"
            style={{ background: 'var(--bg-elevated)', borderLeft: '1px solid var(--surface-border)' }}
          >
            <div className="flex justify-between items-center mb-8">
              <span className="font-display font-bold text-lg" style={{ color: 'var(--primary)' }}>
                DocDuty
              </span>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <svg className="w-5 h-5" fill="none" stroke="var(--text-primary)" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav className="space-y-1">
              <Link
                href="/chat"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-3 rounded-lg text-sm font-medium mb-2 btn-accent text-center"
              >
                Ask DocDuty
              </Link>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-3 rounded-lg text-sm font-medium"
                  style={{
                    color: pathname === link.href ? 'var(--primary)' : 'var(--text-primary)',
                    background: pathname === link.href ? 'var(--surface-subtle)' : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium mt-4"
                style={{ color: 'var(--danger)' }}
              >
                Log out
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
