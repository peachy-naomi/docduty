'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile, getToken, clearToken } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState('#7C3AED');

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile, enabled: mounted });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhoneNumber(profile.phone_number || '');
      setBusinessName(profile.business_name || '');
      setLogoPreview(profile.logo_url || null);
      setBrandColor(profile.brand_color || '#7C3AED');
    }
  }, [profile]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert('Please choose an image under 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      await updateProfile({ full_name: fullName, phone_number: phoneNumber, business_name: businessName, logo_url: logoPreview || undefined, brand_color: brandColor });
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  if (!mounted || !profile) return null;

  return (
    <main className="max-w-2xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold mb-1">Profile</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{profile.email}</p>

      <div className="card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Account Type</span>
          <span className="status-badge" style={{ color: 'var(--primary)', background: 'var(--surface-subtle)' }}>
            {profile.account_type === 'agency' ? 'Agency' : 'Individual'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Subscription</span>
          <span
            className="status-badge"
            style={{
              color: profile.subscription_status === 'active' ? 'var(--success)' : 'var(--warning)',
              background: profile.subscription_status === 'active' ? 'rgba(5,150,105,0.1)' : 'rgba(217,119,6,0.1)',
            }}
          >
            {profile.subscription_status === 'active' ? 'Active' : 'Free Tier'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-2">Business Logo</label>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="var(--text-faint)" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <label className="text-xs font-medium px-3 py-2 rounded-lg cursor-pointer" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}>
              Upload logo
              <input type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} className="hidden" />
            </label>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-faint)' }}>
            Appears on your generated invoices and receipts. PNG or JPG, under 500KB.
          </p>
        </div>
                <div>
          <label className="text-sm font-medium block mb-2">Brand Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer"
              style={{ border: '1px solid var(--surface-border)' }}
            />
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{brandColor}</span>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-faint)' }}>
            Used for the header band on your generated invoices and receipts.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">
            {profile.account_type === 'agency' ? 'Agency / Firm Name' : 'Business Name'}
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Phone Number</label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="input-field"
            placeholder="e.g. +2348012345678"
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-faint)' }}>
            Used for SMS deadline reminders once enabled.
          </p>
        </div>

        {saved && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--success)', background: 'rgba(5,150,105,0.08)' }}>
            Profile updated successfully.
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <button
        onClick={handleLogout}
        className="w-full text-sm font-medium py-3 mt-4"
        style={{ color: 'var(--danger)' }}
      >
        Log Out
      </button>
    </main>
  );
}
