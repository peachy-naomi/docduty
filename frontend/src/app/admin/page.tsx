'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMe,
  getRateHistory,
  createRate,
  getRateAlerts,
  reviewRateAlert,
  getAdminUsers,
  getAuditLog,
  getContractTemplates,
  createTemplate,
  updateTemplate,
  getToken,
} from '@/lib/api';
import AdminSidebar from '@/components/AdminSidebar';

const RATE_TYPES = ['vat', 'lasaa', 'wht', 'stamp_duty', 'paye'];

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, enabled: mounted });

  useEffect(() => {
    if (me && !me.is_admin) router.push('/dashboard');
  }, [me, router]);

  if (!mounted || !me?.is_admin) return null;

  return (
    <div className="flex">
      <AdminSidebar activeTab={tab} onTabChange={setTab} />
      <main className="flex-1 max-w-4xl px-8 py-8">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'rates' && <RateTablesTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'alerts' && <AlertsTab />}
        {tab === 'audit' && <AuditLogTab />}
        {tab === 'resources' && <ResourcesTab />}
      </main>
    </div>
  );
}

function OverviewTab() {
  const { data: usersData } = useQuery({ queryKey: ['admin-users'], queryFn: getAdminUsers });
  const { data: alertsData } = useQuery({ queryKey: ['rate-alerts'], queryFn: getRateAlerts });
  const users = usersData?.users ?? [];
  const activeSubscribers = users.filter((u: any) => u.subscription_status === 'active').length;
  const unreviewedAlerts = (alertsData?.alerts ?? []).filter((a: any) => !a.reviewed).length;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Overview</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>A snapshot of platform activity.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={users.length} />
        <StatCard label="Active Subscribers" value={activeSubscribers} color="var(--success)" />
        <StatCard label="Agency Accounts" value={users.filter((u: any) => u.account_type === 'agency').length} />
        <StatCard label="Unreviewed Alerts" value={unreviewedAlerts} color="var(--warning)" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card p-5">
      <p className="font-display text-2xl font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function UsersTab() {
  const { data } = useQuery({ queryKey: ['admin-users'], queryFn: getAdminUsers });
  const users = data?.users ?? [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">User Management</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Every registered account on the platform.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Business</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Verified</th>
              <th className="p-3 font-medium">Subscription</th>
              <th className="p-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} style={{ borderTop: '1px solid var(--surface-border)' }}>
                <td className="p-3">{u.email}{u.is_admin && <span className="ml-2 status-badge" style={{ color: 'var(--primary)', background: 'var(--surface-subtle)' }}>Admin</span>}</td>
                <td className="p-3">{u.business_name || '—'}</td>
                <td className="p-3 capitalize">{u.account_type || '—'}</td>
                <td className="p-3">
                  <span style={{ color: u.email_verified ? 'var(--success)' : 'var(--text-faint)' }}>
                    {u.email_verified ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="p-3">
                  <span className="status-badge" style={{
                    color: u.subscription_status === 'active' ? 'var(--success)' : 'var(--text-faint)',
                    background: u.subscription_status === 'active' ? 'rgba(5,150,105,0.1)' : 'var(--surface-subtle)',
                  }}>
                    {u.subscription_status === 'active' ? 'Active' : 'Free'}
                  </span>
                </td>
                <td className="p-3 text-xs" style={{ color: 'var(--text-faint)' }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RateTablesTab() {
  const [selectedType, setSelectedType] = useState('vat');
  const [rateDataJson, setRateDataJson] = useState('{"rate_percent": 7.5}');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: historyData } = useQuery({ queryKey: ['rate-history', selectedType], queryFn: () => getRateHistory(selectedType) });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    let parsedData;
    try {
      parsedData = JSON.parse(rateDataJson);
    } catch {
      setError('Rate data must be valid JSON');
      return;
    }
    setLoading(true);
    try {
      await createRate({ rate_type: selectedType, rate_data: parsedData, effective_date: effectiveDate, notes: notes || undefined });
      setSuccess('Rate updated successfully');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['rate-history', selectedType] });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update rate');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Financials — VAT & Rates</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Manage the versioned compliance rate tables.</p>
      <div className="flex gap-1 flex-wrap mb-6">
        {RATE_TYPES.map((type) => (
          <button key={type} onClick={() => setSelectedType(type)} className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
            style={{
              background: selectedType === type ? 'var(--surface-subtle)' : 'transparent',
              border: `1px solid ${selectedType === type ? 'var(--primary)' : 'var(--surface-border)'}`,
              color: selectedType === type ? 'var(--primary)' : 'var(--text-muted)',
            }}>
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h3 className="font-display font-semibold text-sm">Add New Rate Entry</h3>
          <div>
            <label className="text-sm font-medium block mb-2">Rate Data (JSON)</label>
            <textarea value={rateDataJson} onChange={(e) => setRateDataJson(e.target.value)} className="input-field font-mono text-xs" rows={4} required />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Effective Date</label>
            <input type="date" required value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Notes</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" placeholder="e.g. Confirmed via FIRS circular dated..." />
          </div>
          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}>{error}</p>}
          {success && <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--success)', background: 'rgba(5,150,105,0.08)' }}>{success}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Add Rate Entry'}</button>
        </form>
        <div className="card p-6">
          <h3 className="font-display font-semibold text-sm mb-4">History</h3>
          <div className="space-y-3">
            {historyData?.history?.map((entry: any) => (
              <div key={entry.id} className="text-xs pb-3" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <p className="font-mono mb-1">{JSON.stringify(entry.rate_data)}</p>
                <p style={{ color: 'var(--text-faint)' }}>Effective {entry.effective_date} {entry.notes && `— ${entry.notes}`}</p>
              </div>
            ))}
            {(!historyData?.history || historyData.history.length === 0) && <p className="text-xs" style={{ color: 'var(--text-faint)' }}>No entries yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplatesTab() {
  const { data } = useQuery({ queryKey: ['contract-templates'], queryFn: getContractTemplates });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [fieldsJson, setFieldsJson] = useState('[]');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  function startEditing(template: any) {
    setEditingId(template.id);
    setName(template.name);
    setSlug(template.slug);
    setFieldsJson(JSON.stringify(template.fields, null, 2));
    setBodyTemplate('');
  }

  function startNew() {
    setEditingId(0);
    setName('');
    setSlug('');
    setFieldsJson('[]');
    setBodyTemplate('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    let fields;
    try {
      fields = JSON.parse(fieldsJson);
    } catch {
      setError('Fields must be valid JSON');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await updateTemplate(editingId, { name, slug, fields, body_template: bodyTemplate });
      } else {
        await createTemplate({ name, slug, fields, body_template: bodyTemplate });
      }
      setSuccess('Template saved successfully');
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      setEditingId(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Legal Hub — Templates</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Editing a template only affects documents generated after the change — previously generated documents keep their original text permanently.
      </p>

      {editingId === null ? (
        <>
          <button onClick={startNew} className="btn-accent text-sm mb-4">+ New Template</button>
          <div className="space-y-3">
            {data?.templates?.map((t: any) => (
              <div key={t.id} className="card p-5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{t.slug} · {t.fields.length} fields</p>
                </div>
                <button onClick={() => startEditing(t)} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}>
                  Edit
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <button type="button" onClick={() => setEditingId(null)} className="text-xs font-medium" style={{ color: 'var(--primary)' }}>← Cancel</button>
          <div>
            <label className="text-sm font-medium block mb-2">Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Slug</label>
            <input type="text" required value={slug} onChange={(e) => setSlug(e.target.value)} className="input-field" disabled={!!editingId} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Fields (JSON)</label>
            <textarea value={fieldsJson} onChange={(e) => setFieldsJson(e.target.value)} className="input-field font-mono text-xs" rows={4} required />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Body Template (use {'{{field_name}}'} placeholders)</label>
            <textarea value={bodyTemplate} onChange={(e) => setBodyTemplate(e.target.value)} className="input-field font-mono text-xs" rows={8} required placeholder={editingId ? 'Leave blank to keep current text, or paste full replacement...' : ''} />
          </div>
          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}>{error}</p>}
          {success && <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--success)', background: 'rgba(5,150,105,0.08)' }}>{success}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Save Template'}</button>
        </form>
      )}
    </div>
  );
}

function AlertsTab() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['rate-alerts'], queryFn: getRateAlerts });
  const alerts = data?.alerts ?? [];

  async function handleReview(id: number) {
    await reviewRateAlert(id);
    queryClient.invalidateQueries({ queryKey: ['rate-alerts'] });
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Rate Change Alerts</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Detected source changes awaiting your review.</p>
      <div className="space-y-3">
        {alerts.map((alert: any) => (
          <div key={alert.id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm capitalize">{alert.rate_type} — {alert.source_name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Detected {new Date(alert.detected_at).toLocaleString()}</p>
                <a href={alert.url} target="_blank" rel="noopener noreferrer" className="text-xs mt-1 inline-block" style={{ color: 'var(--primary)' }}>View source →</a>
              </div>
              {!alert.reviewed ? (
                <button onClick={() => handleReview(alert.id)} className="text-xs font-medium px-3 py-1.5 rounded-lg shrink-0" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}>
                  Mark Reviewed
                </button>
              ) : (
                <span className="status-badge shrink-0" style={{ color: 'var(--success)', background: 'rgba(5,150,105,0.1)' }}>Reviewed</span>
              )}
            </div>
          </div>
        ))}
        {alerts.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--text-faint)' }}>No rate change alerts</p>}
      </div>
    </div>
  );
}

function AuditLogTab() {
  const { data } = useQuery({ queryKey: ['audit-log'], queryFn: getAuditLog });
  const entries = data?.entries ?? [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Audit Log</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Every document generated across the platform, most recent first.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
              <th className="p-3 font-medium">Reference</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Account</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e: any) => (
              <tr key={`${e.document_type}-${e.id}`} style={{ borderTop: '1px solid var(--surface-border)' }}>
                <td className="p-3 font-medium">{e.reference}</td>
                <td className="p-3 capitalize">{e.document_type}</td>
                <td className="p-3">{e.account_name} ({e.account_email})</td>
                <td className="p-3">{e.total_kobo ? `₦${(e.total_kobo / 100).toLocaleString()}` : '—'}</td>
                <td className="p-3 text-xs" style={{ color: 'var(--text-faint)' }}>{new Date(e.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center" style={{ color: 'var(--text-faint)' }}>No documents generated yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResourcesTab() {
  const links = [
    { name: 'Nigeria Data Protection Commission (NDPC)', url: 'https://ndpc.gov.ng/', desc: 'Official Nigerian data protection regulator' },
    { name: 'EU GDPR Guidelines', url: 'https://gdpr.eu/', desc: 'Reference for businesses with EU-facing data flows' },
    { name: 'PwC Worldwide Tax Summaries', url: 'https://taxsummaries.pwc.com/', desc: 'Cross-country tax reference, useful for future multi-jurisdiction expansion' },
    { name: 'FIRS (Federal Inland Revenue Service)', url: 'https://www.firs.gov.ng/', desc: 'Nigerian federal tax authority — source for VAT/WHT rate verification' },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Regulatory Resources</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Reference links for verifying rates and staying current on compliance requirements.
      </p>
      <div className="space-y-3">
        {links.map((link) => (
          <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="card p-5 flex items-center justify-between hover:-translate-y-0.5 transition-transform block">
            <div>
              <p className="font-medium text-sm">{link.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{link.desc}</p>
            </div>
            <span style={{ color: 'var(--primary)' }}>→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
