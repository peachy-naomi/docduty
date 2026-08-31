'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getMe, getInvoices, getDeadlines, getToken } from '@/lib/api';
import HealthScoreCard from '@/components/HealthScoreCard';

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, enabled: mounted });
  const { data: invoicesData } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices, enabled: mounted });
  const { data: deadlinesData } = useQuery({ queryKey: ['deadlines'], queryFn: getDeadlines, enabled: mounted });

  if (!mounted) return null;

  const recentDocs = invoicesData?.invoices?.slice(0, 4) ?? [];
  const upcomingDeadlines = deadlinesData?.deadlines?.slice(0, 3) ?? [];

  return (
    <main className="max-w-5xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold mb-1">
        Welcome{me?.account?.business_name ? `, ${me.account.business_name}` : ''}
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        {me?.account?.account_type === 'agency' ? 'Agency Account' : 'Individual Account'}
      </p>

      {/* Ask DocDuty hero card */}
      <motion.a
        href="/chat"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="block rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, var(--primary), var(--accent))` }}
      >
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs font-mono mb-1 uppercase tracking-wide">AI Assistant</p>
            <p className="text-white font-display text-lg font-semibold mb-1">What do you need help with today?</p>
            <p className="text-white/80 text-sm">Ask for an invoice, check a deadline, or get a quick compliance answer.</p>
          </div>
          <svg className="w-8 h-8 text-white/90 shrink-0 ml-4" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.5 0-2.91-.32-4.15-.89L3 20l1.05-3.15A7.94 7.94 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      </motion.a>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <QuickAction href="/documents/new/invoice" icon="doc" label="New Invoice" />
        <QuickAction href="/documents/new/contract" icon="contract" label="New Contract" />
        <QuickAction href="/calculators" icon="calc" label="Calculators" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HealthScoreCard />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm">Recent Documents</h2>
            <a href="/documents" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              View all →
            </a>
          </div>
          {recentDocs.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-faint)' }}>
              No documents yet
            </p>
          ) : (
            <div className="space-y-1">
              {recentDocs.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'var(--surface-border)' }}>
                  <div>
                    <p className="text-sm font-medium">{doc.invoice_number}</p>
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{doc.client_name}</p>
                  </div>
                  <p className="text-sm font-semibold">₦{doc.total_naira?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm">Upcoming Deadlines</h2>
            <a href="/deadlines" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              View all →
            </a>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-faint)' }}>
              No upcoming deadlines
            </p>
          ) : (
            <div className="space-y-1">
              {upcomingDeadlines.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'var(--surface-border)' }}>
                  <div>
                    <p className="text-sm font-medium">{d.deadline_type}</p>
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{d.client_name}</p>
                  </div>
                  <span
                    className="status-badge"
                    style={{
                      color: d.days_remaining <= 7 ? 'var(--danger)' : 'var(--warning)',
                      background: d.days_remaining <= 7 ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)',
                    }}
                  >
                    {d.days_remaining}d
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  const icons: Record<string, React.ReactNode> = {
    doc: <><path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6l5 5v13a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z" /><path strokeLinecap="round" d="M13 2v6h6" /></>,
    contract: <><rect x="4" y="2" width="16" height="20" rx="2" /><path strokeLinecap="round" d="M8 7h8M8 11h8M8 15h5" /></>,
    calc: <><rect x="4" y="2" width="16" height="20" rx="2" /><path strokeLinecap="round" d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01" /></>,
  };
  return (
    <a href={href} className="card p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-transform">
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--surface-subtle)' }}>
        <svg className="w-4 h-4" fill="none" stroke="var(--primary)" strokeWidth="1.8" viewBox="0 0 24 24">
          {icons[icon]}
        </svg>
      </div>
      <span className="text-sm font-medium">{label}</span>
    </a>
  );
}
