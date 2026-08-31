'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { googleAuth, saveToken, getMe } from '@/lib/api';

declare global {
  interface Window {
    google: any;
  }
}

export default function GoogleSignInButton({
  accountType,
  businessName,
  disabled,
}: {
  accountType?: string;
  businessName?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (disabled) return;

    function initGoogle() {
      if (!window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
      });
    }

    async function handleCredentialResponse(response: any) {
      setError('');
      try {
        const data = await googleAuth(response.credential, accountType, businessName);
        saveToken(data.token);
        const me = await getMe();
        router.push(me.is_admin ? '/admin' : '/chat');
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Google sign-in failed');
      }
    }

    if (window.google) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          initGoogle();
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [accountType, businessName, disabled, router]);

  if (disabled) {
    return (
      <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
        Fill in your business details above first, then Google sign-in becomes available.
      </p>
    );
  }

  return (
    <div>
      <div ref={buttonRef} className="flex justify-center" />
      {error && (
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--danger)' }}>{error}</p>
      )}
    </div>
  );
}
