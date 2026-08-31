'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { getPublicInvoice, verifyPublicPayment } from '@/lib/api';

export default function PayPage() {
  return (
    <Suspense fallback={null}>
      <PayContent />
    </Suspense>
  );
}

function PayContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublicInvoice(token)
      .then((data) => setInvoice(data))
      .catch(() => setError('Invoice not found or link expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (searchParams.get('reference') && invoice && invoice.payment_status !== 'paid') {
      verifyPublicPayment(token).then((result) => {
        if (result.payment_status === 'paid') {
          setInvoice((prev: any) => ({ ...prev, payment_status: 'paid' }));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, searchParams]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full animate-spin border-2 border-t-transparent" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <p style={{ color: 'var(--text-muted)' }}>{error || 'Invoice not found.'}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full text-center">
        <p className="font-display font-bold text-lg mb-1" style={{ color: 'var(--primary)' }}>
          {invoice.business_name}
        </p>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Invoice {invoice.invoice_number}
        </p>

        <p className="text-3xl font-display font-bold mb-1">₦{invoice.total_naira.toLocaleString()}</p>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Billed to {invoice.bill_to_name}</p>

        {invoice.payment_status === 'paid' ? (
          <div className="p-4 rounded-xl" style={{ background: 'rgba(5,150,105,0.08)' }}>
            <p className="font-semibold" style={{ color: 'var(--success)' }}>✓ Payment Received</p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
            Contact {invoice.business_name} to complete payment for this invoice.
          </p>
        )}
      </div>
    </main>
  );
}
