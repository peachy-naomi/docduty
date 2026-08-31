'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { login, saveToken, getMe } from '@/lib/api';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      saveToken(data.token);
      const me = await getMe();
      router.push(me.is_admin ? '/admin' : '/chat');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
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
            Welcome back.
          </h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Your documents, deadlines, and AI assistant are right where you left them.
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

          <h1 className="font-display text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Log in</h1>
          <p className="text-sm mb-8" style={{ color: '#6B7280' }}>Access your account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="flex justify-end">
              <a href="/forgot-password" className="text-xs font-medium" style={{ color: '#7C3AED' }}>Forgot password?</a>
            </div>

            {error && (
              <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#DC2626', background: 'rgba(220,38,38,0.08)' }}>{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            <p className="text-sm text-center" style={{ color: '#6B7280' }}>
              Don&apos;t have an account?{' '}
              <a href="/signup" style={{ color: '#7C3AED' }} className="font-medium">Sign up</a>
            </p>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
            <span className="text-xs" style={{ color: '#9CA3AF' }}>OR</span>
            <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
          </div>

          <GoogleSignInButton />
        </motion.div>
      </div>
    </div>
  );
}
