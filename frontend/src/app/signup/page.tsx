'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { signup } from '@/lib/api';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'agency'>('individual');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup({ email, password, full_name: fullName, account_type: accountType, business_name: businessName });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div
        className="relative hidden md:flex items-center px-14 overflow-hidden sticky top-0 h-screen"
        style={{ background: 'linear-gradient(160deg, #1a0b2e 0%, #2d1155 60%, #1a0b2e 100%)' }}
      >
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(124,58,237,0.5), transparent 55%)' }} />
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 80% 85%, rgba(167,139,250,0.4), transparent 50%)' }} />

        <div className="relative w-full max-w-sm">
          <span className="font-display font-bold text-xl text-white block mb-8">DocDuty</span>
          <div className="border-t mb-8" style={{ borderColor: 'rgba(255,255,255,0.15)' }} />

          <h2 className="font-display text-3xl font-bold text-white mb-3 leading-tight">
            Let DocDuty handle<br />the paperwork.
          </h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
            AI-assisted invoicing, contracts, and compliance for Nigerian businesses.
          </p>

          <div className="border-t mb-8" style={{ borderColor: 'rgba(255,255,255,0.15)' }} />

          <div className="flex gap-10">
            <div>
              <p className="font-display text-2xl font-bold text-white">5</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Document types</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-white">7.5%</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>VAT auto-calculated</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12" style={{ background: 'white' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <span className="font-display font-bold text-lg mb-8 block md:hidden" style={{ color: '#7C3AED' }}>DocDuty</span>

          {success ? (
            <>
              <div className="w-14 h-14 rounded-full mb-4 flex items-center justify-center" style={{ background: '#F3EFFD' }}>
                <svg className="w-6 h-6" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="font-display text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Check your email</h1>
              <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
                We sent a verification link to <span style={{ color: '#1A1A1A' }}>{email}</span>.
              </p>
              <button onClick={() => router.push('/login')} className="btn-primary w-full">
                Go to Login
              </button>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Create your account</h1>
              <p className="text-sm mb-8" style={{ color: '#6B7280' }}>Start free, upgrade anytime.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: '#6B7280' }}>Full Name</label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" style={{ background: '#FAFAFA', color: '#1A1A1A' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: '#6B7280' }}>Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" style={{ background: '#FAFAFA', color: '#1A1A1A' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: '#6B7280' }}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pr-11"
                      style={{ background: '#FAFAFA', color: '#1A1A1A' }}
                    />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Toggle password">
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="#6B7280" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 5.09A9.77 9.77 0 0112 5c5 0 9 4 10 7-.35 1.06-1 2.2-1.88 3.29M6.53 6.53C4.5 7.86 2.9 9.7 2 12c1 3 5 7 10 7 1.2 0 2.35-.22 3.4-.62" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="#6B7280" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: '#6B7280' }}>Account Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountType('individual')}
                      className="p-3 rounded-xl text-sm font-medium text-left transition-colors"
                      style={{
                        background: accountType === 'individual' ? '#F3EFFD' : 'transparent',
                        border: `1px solid ${accountType === 'individual' ? '#7C3AED' : '#E5E7EB'}`,
                      }}
                    >
                      <span className="block font-semibold" style={{ color: '#1A1A1A' }}>Individual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('agency')}
                      className="p-3 rounded-xl text-sm font-medium text-left transition-colors"
                      style={{
                        background: accountType === 'agency' ? '#F3EFFD' : 'transparent',
                        border: `1px solid ${accountType === 'agency' ? '#7C3AED' : '#E5E7EB'}`,
                      }}
                    >
                      <span className="block font-semibold" style={{ color: '#1A1A1A' }}>Agency</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: '#6B7280' }}>
                    {accountType === 'agency' ? 'Agency Name' : 'Business Name'}
                  </label>
                  <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="input-field" style={{ background: '#FAFAFA', color: '#1A1A1A' }} />
                </div>

                {error && (
                  <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#DC2626', background: 'rgba(220,38,38,0.08)' }}>{error}</p>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Creating account...' : 'Sign Up'}
                </button>

                <p className="text-sm text-center" style={{ color: '#6B7280' }}>
                  Already have an account?{' '}
                  <a href="/login" style={{ color: '#7C3AED' }} className="font-medium">Log in</a>
                </p>
              </form>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
                <span className="text-xs" style={{ color: '#9CA3AF' }}>OR</span>
                <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
              </div>

              <GoogleSignInButton
                accountType={accountType}
                businessName={businessName}
                disabled={!businessName.trim()}
              />
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
