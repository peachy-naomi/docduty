'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  if (!mounted) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = getToken();

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8 text-center">
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--surface-subtle)' }}>
          <svg className="w-6 h-6" fill="none" stroke="var(--success)" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-display text-xl font-bold mb-1">Document Generated</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Your document is ready to download.
        </p>
        
        <a
          href={`${apiUrl}/contracts/${id}/pdf?token=${token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full block text-center mb-3"
        >
          Download PDF
        </a>
        <a href="/documents" className="block text-center text-sm font-medium py-2.5 rounded-xl" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}>
          Back to Documents
        </a>
      </div>
    </main>
  );
}
