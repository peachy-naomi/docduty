'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDeadlines, createDeadline, completeDeadline, getClients, getToken } from '@/lib/api';

const RECURRENCE_LABELS: Record<string, string> = {
  none: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

export default function DeadlinesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [clientId, setClientId] = useState('');
  const [deadlineType, setDeadlineType] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  const [reminderDays, setReminderDays] = useState('30');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  const { data: deadlinesData } = useQuery({ queryKey: ['deadlines'], queryFn: getDeadlines, enabled: mounted });
  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: getClients, enabled: mounted });
  const deadlines = deadlinesData?.deadlines ?? [];
  const clients = clientsData?.clients ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createDeadline({
        client_id: Number(clientId),
        deadline_type: deadlineType,
        description: description || undefined,
        due_date: dueDate,
        recurrence,
        reminder_days_before: Number(reminderDays),
      });
      setDeadlineType('');
      setDescription('');
      setDueDate('');
      setRecurrence('none');
      setReminderDays('30');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create deadline');
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(id: number) {
    await completeDeadline(id);
    queryClient.invalidateQueries({ queryKey: ['deadlines'] });
  }

  if (!mounted) return null;

  return (
    <main className="max-w-3xl px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Deadlines</h1>
        <button onClick={() => setShowForm((s) => !s)} className="btn-accent text-sm">
          {showForm ? 'Cancel' : '+ Add Deadline'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="input-field">
              <option value="">Select a client</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>{c.business_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Deadline Type</label>
            <input
              type="text"
              required
              placeholder="e.g. LASAA Signage Permit Renewal"
              value={deadlineType}
              onChange={(e) => setDeadlineType(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-2">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Recurrence</label>
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="input-field">
                <option value="none">One-time</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Remind me (days before)</label>
            <input
              type="number"
              min="1"
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
              className="input-field"
            />
          </div>
          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Adding...' : 'Add Deadline'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {deadlines.map((d: any) => (
          <div key={d.id} className="card p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium truncate">{d.deadline_type}</p>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                {d.client_name} · {RECURRENCE_LABELS[d.recurrence]} · Due {d.due_date}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className="status-badge"
                style={{
                  color: d.days_remaining <= 7 ? 'var(--danger)' : 'var(--warning)',
                  background: d.days_remaining <= 7 ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)',
                }}
              >
                {d.days_remaining}d
              </span>
              <button
                onClick={() => handleComplete(d.id)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}
              >
                Mark Done
              </button>
            </div>
          </div>
        ))}
        {deadlines.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-faint)' }}>
            No upcoming deadlines
          </p>
        )}
      </div>
    </main>
  );
}
