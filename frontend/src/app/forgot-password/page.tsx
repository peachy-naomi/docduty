'use client';

import { useState } from 'react';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'white' }}>
      <div className="w-full max-w-sm">
        {sent ? (
          <>
            <div className="w-14 h-14 rounded-full mb-4 flex items-center justify-center" style={{ background: '#F3EFFD' }}>
              <svg className="w-6 h-6" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Check your email</h1>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              If that email is registered, a password reset link has been sent.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Reset your password</h1>
            <p className="text-sm mb-8" style={{ color: '#6B7280' }}>Enter your email and we&apos;ll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: '#6B7280' }}>Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" style={{ background: '#FAFAFA', color: '#1A1A1A' }} />
              </div>
              {error && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#DC2626', background: 'rgba(220,38,38,0.08)' }}>{error}</p>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <p className="text-sm text-center" style={{ color: '#6B7280' }}>
                <a href="/login" style={{ color: '#7C3AED' }} className="font-medium">Back to login</a>
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
