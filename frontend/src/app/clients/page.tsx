'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getClients, createClient, getMe, getToken } from '@/lib/api';

export default function ClientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, enabled: mounted });
  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: getClients, enabled: mounted });
  const clients = clientsData?.clients ?? [];
  const isAgency = me?.account?.account_type === 'agency';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createClient({
        business_name: businessName,
        contact_email: contactEmail || undefined,
        contact_phone: contactPhone || undefined,
        address: address || undefined,
      });
      setBusinessName('');
      setContactEmail('');
      setContactPhone('');
      setAddress('');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add client');
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <main className="max-w-3xl px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Clients</h1>
        {isAgency && (
          <button onClick={() => setShowForm((s) => !s)} className="btn-accent text-sm">
            {showForm ? 'Cancel' : '+ Add Client'}
          </button>
        )}
      </div>

      {!isAgency && (
        <div className="card p-4 mb-6" style={{ background: 'var(--surface-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Individual accounts operate on a single business. Upgrade to an agency account to manage multiple clients.
          </p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Business Name</label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-2">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Contact Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input-field"
            />
          </div>
          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Adding...' : 'Add Client'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {clients.map((client: any) => (
          <div key={client.id} className="card p-5">
            <p className="font-semibold">{client.business_name}</p>
            {(client.contact_email || client.contact_phone) && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {[client.contact_email, client.contact_phone].filter(Boolean).join(' · ')}
              </p>
            )}
            {client.address && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{client.address}</p>
            )}
          </div>
        ))}
        {clients.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-faint)' }}>
            No clients yet
          </p>
        )}
      </div>
    </main>
  );
}
