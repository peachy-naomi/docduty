'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { resetPassword } from '@/lib/api';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'white' }}>
      <div className="w-full max-w-sm">
        {success ? (
          <>
            <div className="w-14 h-14 rounded-full mb-4 flex items-center justify-center" style={{ background: '#F3EFFD' }}>
              <svg className="w-6 h-6" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Password Reset</h1>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>You can now log in with your new password.</p>
            <button onClick={() => router.push('/login')} className="btn-primary w-full">Go to Login</button>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Set a new password</h1>
            <p className="text-sm mb-8" style={{ color: '#6B7280' }}>Choose a new password for your account.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: '#6B7280' }}>New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  style={{ background: '#FAFAFA', color: '#1A1A1A' }}
                />
              </div>
              {error && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#DC2626', background: 'rgba(220,38,38,0.08)' }}>{error}</p>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
