'use client';

import { useState } from 'react';
import { generatePaymentLink } from '@/lib/api';

export default function InvoicePaymentActions({ invoiceId, invoiceNumber, totalNaira }: {
  invoiceId: number;
  invoiceNumber: string;
  totalNaira: number;
}) {
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerateLink() {
    setLoading(true);
    setError('');
    try {
      const data = await generatePaymentLink(invoiceId);
      setShareUrl(data.share_url);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate payment link');
    } finally {
      setLoading(false);
    }
  }

  function shareViaWhatsApp() {
    const message = `Hi! Here's invoice ${invoiceNumber} for \u20A6${totalNaira.toLocaleString()}. You can view and pay it here: ${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="card p-5">
      <h3 className="font-display font-semibold text-sm mb-3">Get Paid</h3>

      {!shareUrl ? (
        <button onClick={handleGenerateLink} disabled={loading} className="btn-accent w-full text-sm">
          {loading ? 'Generating...' : 'Generate Payment Link'}
        </button>
      ) : (
        <div className="space-y-2">
          <button onClick={shareViaWhatsApp} className="btn-accent w-full text-sm flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2z" />
            </svg>
            Share via WhatsApp
          </button>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-xs" style={{ color: 'var(--primary)' }}>
            Or copy the payment link
          </a>
        </div>
      )}

      {error && (
        <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{error}</p>
      )}
    </div>
  );
}
