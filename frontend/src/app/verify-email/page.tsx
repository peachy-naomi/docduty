'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyEmail } from '@/lib/api';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'already_verified' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const hasAttempted = useRef(false);

  function attemptVerify() {
    if (!token) {
      setStatus('error');
      setErrorMsg('Missing verification token.');
      return;
    }
    setStatus('loading');
    verifyEmail(token)
      .then((data) => {
        setStatus(data.already_verified ? 'already_verified' : 'success');
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err.response?.data?.detail || 'Verification failed');
      });
  }

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;
    attemptVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="card p-8 text-center max-w-md w-full">
        {status === 'loading' && (
          <>
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin border-2 border-t-transparent"
              style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
            />
            <p style={{ color: 'var(--text-muted)' }}>Verifying your email...</p>
          </>
        )}

        {(status === 'success' || status === 'already_verified') && (
          <>
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--surface-subtle)' }}>
              <svg className="w-6 h-6" fill="none" stroke="var(--success)" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-display text-xl font-bold mb-1">
              {status === 'already_verified' ? 'Already Verified' : 'Email Verified'}
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              {status === 'already_verified'
                ? 'This email was already confirmed. You can log in now.'
                : 'Your account is now active.'}
            </p>
            <button onClick={() => router.push('/login')} className="btn-primary w-full">
              Go to Login
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--surface-subtle)' }}>
              <svg className="w-6 h-6" fill="none" stroke="var(--danger)" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="font-display text-xl font-bold mb-1">Verification Failed</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{errorMsg}</p>
            <div className="space-y-3">
              <button onClick={attemptVerify} className="btn-primary w-full">
                Retry Verification
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="w-full text-sm font-medium py-2.5 rounded-xl"
                style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}
              >
                Back to Signup
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
