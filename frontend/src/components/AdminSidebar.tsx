'use client';

import { useRouter } from 'next/navigation';
import { clearToken } from '@/lib/api';
import ThemeToggle from './ThemeToggle';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'users', label: 'User Management', icon: 'users' },
  { id: 'rates', label: 'Financials (VAT & Rates)', icon: 'calc' },
  { id: 'templates', label: 'Legal Hub (Templates)', icon: 'doc' },
  { id: 'alerts', label: 'Rate Change Alerts', icon: 'bell' },
  { id: 'audit', label: 'Audit Log', icon: 'clock' },
  { id: 'resources', label: 'Regulatory Resources', icon: 'link' },
];

function Icon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    users: <><path strokeLinecap="round" strokeLinejoin="round" d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1" /><circle cx="9" cy="7" r="4" /></>,
    calc: <><rect x="4" y="2" width="16" height="20" rx="2" /><path strokeLinecap="round" d="M8 6h8M8 10h.01M12 10h.01M16 10h.01" /></>,
    doc: <><path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6l5 5v13a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z" /><path strokeLinecap="round" d="M13 2v6h6" /></>,
    bell: <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    clock: <><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 3" /></>,
    link: <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />,
  };
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      {icons[name]}
    </svg>
  );
}

export default function AdminSidebar({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <aside
      className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 p-4"
      style={{ background: '#1a0b2e', borderRight: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="font-display font-bold text-lg text-white">DocDuty</span>
        <ThemeToggle />
      </div>
      <span className="text-[10px] font-mono uppercase tracking-widest px-1 mb-6" style={{ color: '#A78BFA' }}>
        Admin Console
      </span>

     
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => onTabChange(section.id)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-left transition-colors"
            style={{
              color: activeTab === section.id ? '#A78BFA' : 'rgba(255,255,255,0.65)',
              background: activeTab === section.id ? 'rgba(167,139,250,0.1)' : 'transparent',
            }}
          >
            <Icon name={section.icon} />
            {section.label}
          </button>
        ))}
      </nav>

      <button onClick={handleLogout} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium" style={{ color: '#F87171' }}>
        Log out
      </button>
    </aside>
  );
}
