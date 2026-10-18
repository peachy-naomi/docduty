'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPendingDrafts, approveDraft, rejectDraft, getToken } from '@/lib/api';

export default function DraftsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedText, setEditedText] = useState('');
  const [justApprovedId, setJustApprovedId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  const { data } = useQuery({ queryKey: ['pending-drafts'], queryFn: getPendingDrafts, enabled: mounted });
  const drafts = data?.drafts ?? [];

  function startEditing(draft: any) {
    setEditingId(draft.id);
    setEditedText(draft.rendered_body);
  }

  async function handleApprove(id: number, useEdited: boolean) {
    setError('');
    try {
      await approveDraft(id, useEdited ? editedText : undefined);
      setEditingId(null);
      setJustApprovedId(id);
      queryClient.invalidateQueries({ queryKey: ['pending-drafts'] });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to approve');
    }
  }

  async function handleReject(id: number) {
    if (!confirm('Discard this draft permanently?')) return;
    await rejectDraft(id);
    queryClient.invalidateQueries({ queryKey: ['pending-drafts'] });
  }

  if (!mounted) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = getToken();

  return (
    <main className="max-w-3xl px-8 py-8">
      <a href="/documents" className="text-sm font-medium mb-4 inline-block" style={{ color: 'var(--primary)' }}>
        ← Back to Documents
      </a>
      <h1 className="font-display text-2xl font-bold mb-1">Pending Drafts</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        AI-drafted documents tailored to your business. Review carefully before approving.
        These are not legally reviewed until you confirm them.
      </p>

      {error && (
        <p className="text-sm px-3 py-2 rounded-lg mb-4" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}>
          {error}
        </p>
      )}

      {justApprovedId && (
        <div
          className="card p-5 mb-4 flex items-center justify-between"
          style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.2)' }}
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="var(--success)" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Document approved and ready</span>
          </div>
          <a
            href={`${apiUrl}/contracts/${justApprovedId}/pdf?token=${token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm"
          >
            Download PDF
          </a>
        </div>
      )}

      <div className="space-y-4">
        {drafts.map((draft: any) => (
          <div key={draft.id} className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-sm">{draft.client_name}</p>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  Drafted {new Date(draft.created_at).toLocaleString()}
                </p>
              </div>
              <span className="status-badge" style={{ color: 'var(--warning)', background: 'rgba(217,119,6,0.1)' }}>
                Pending Review
              </span>
            </div>

            {editingId === draft.id ? (
              <>
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="input-field font-mono text-xs mb-3"
                  rows={12}
                />
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(draft.id, true)} className="btn-primary text-sm flex-1">
                    Save Edits & Approve
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-sm font-medium px-4 py-2 rounded-xl"
                    style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  className="text-xs whitespace-pre-wrap p-4 rounded-xl mb-3 max-h-64 overflow-y-auto"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}
                >
                  {draft.rendered_body}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(draft.id, false)} className="btn-primary text-sm flex-1">
                    Approve As-Is
                  </button>
                  <button
                    onClick={() => startEditing(draft)}
                    className="text-sm font-medium px-4 py-2 rounded-xl"
                    style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleReject(draft.id)}
                    className="text-sm font-medium px-4 py-2 rounded-xl"
                    style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}
                  >
                    Reject
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {drafts.length === 0 && !justApprovedId && (
          <p className="text-sm text-center py-12" style={{ color: 'var(--text-faint)' }}>
            No pending drafts
          </p>
        )}
      </div>
    </main>
  );
}
