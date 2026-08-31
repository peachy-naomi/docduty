'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getInvoiceDetail, getToken } from '@/lib/api';
import InvoicePaymentActions from '@/components/InvoicePaymentActions';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  const { data: invoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoiceDetail(id),
    enabled: mounted,
  });

  if (!mounted || !invoice) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = getToken();

  return (
    <main className="max-w-3xl px-8 py-8">
      <a href="/documents" className="text-sm font-medium mb-4 inline-block" style={{ color: 'var(--primary)' }}>
        ← Back to Documents
      </a>

      <div className="card p-6 mb-4">
        <div className="mb-4">
          <h1 className="font-display text-xl font-bold">{invoice.invoice_number}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{invoice.bill_to_name}</p>
        </div>

        <div className="space-y-1 mb-4">
          {invoice.items?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm py-2" style={{ borderTop: i > 0 ? '1px solid var(--surface-border)' : 'none' }}>
              <span>{item.description} × {item.quantity}</span>
              <span>₦{(item.line_total_kobo / 100).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 space-y-1 mb-5" style={{ borderTop: '1px solid var(--surface-border)' }}>
          <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>Subtotal</span>
            <span>₦{(invoice.subtotal_kobo / 100).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>VAT ({invoice.vat_rate_percent}%)</span>
            <span>₦{(invoice.vat_amount_kobo / 100).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold text-base pt-1">
            <span>Total</span>
            <span>₦{(invoice.total_kobo / 100).toLocaleString()}</span>
          </div>
        </div>

        
        <a
          href={`${apiUrl}/invoices/${id}/pdf?token=${token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full block text-center"
        >
          Download PDF
        </a>
      </div>

      {invoice.document_type === 'invoice' && (
        <InvoicePaymentActions
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number}
          totalNaira={invoice.total_kobo / 100}
        />
      )}
    </main>
  );
}
