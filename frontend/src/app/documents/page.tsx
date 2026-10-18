'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getInvoices, getToken } from '@/lib/api';

const TYPE_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  receipt: 'Receipt',
  quotation: 'Quotation',
};

export default function DocumentsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  const { data } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices, enabled: mounted });
  const invoices = data?.invoices ?? [];

  if (!mounted) return null;

  return (
    <main className="max-w-4xl px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <a href="/documents/drafts" className="text-sm font-medium px-4 py-2 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}>
            Pending Drafts
          </a>
          <a href="/documents/new/invoice" className="btn-accent text-sm">
            + New Invoice
          </a>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
              <th className="p-4 font-medium">Number</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Client</th>
              <th className="p-4 font-medium">Amount</th>
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((doc: any) => (
              <tr
                key={doc.id}
                className="cursor-pointer hover:opacity-80"
                style={{ borderTop: '1px solid var(--surface-border)' }}
                onClick={() => router.push(`/documents/${doc.id}`)}
              >
                <td className="p-4 font-medium">{doc.invoice_number}</td>
                <td className="p-4">
                  <span className="status-badge" style={{ color: 'var(--primary)', background: 'var(--surface-subtle)' }}>
                    {TYPE_LABELS[doc.document_type] || doc.document_type}
                  </span>
                </td>
                <td className="p-4" style={{ color: 'var(--text-muted)' }}>{doc.client_name}</td>
                <td className="p-4 font-semibold">₦{doc.total_naira?.toLocaleString()}</td>
                <td className="p-4 text-right" style={{ color: 'var(--primary)' }}>→</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center" style={{ color: 'var(--text-faint)' }}>
                  No documents yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
