'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';
import VATCalculator from '@/components/calculators/VATCalculator';
import CategoryCalculator from '@/components/calculators/CategoryCalculator';
import PAYECalculator from '@/components/calculators/PAYECalculator';

const TABS = [
  { id: 'vat', label: 'VAT' },
  { id: 'lasaa', label: 'LASAA' },
  { id: 'wht', label: 'WHT' },
  { id: 'stamp_duty', label: 'Stamp Duty' },
  { id: 'paye', label: 'PAYE' },
];

export default function CalculatorsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('vat');

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  if (!mounted) return null;

  return (
    <main className="max-w-2xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold mb-1">Calculators</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Nigerian tax and regulatory fee calculators, based on current admin-reviewed rates.
      </p>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              background: activeTab === tab.id ? 'var(--primary)' : 'var(--surface-subtle)',
              color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'vat' && <VATCalculator />}
      {activeTab === 'lasaa' && <CategoryCalculator rateType="lasaa" label="LASAA Signage Fee" />}
      {activeTab === 'wht' && <CategoryCalculator rateType="wht" label="Withholding Tax" />}
      {activeTab === 'stamp_duty' && <CategoryCalculator rateType="stamp_duty" label="Stamp Duty" />}
      {activeTab === 'paye' && <PAYECalculator />}
    </main>
  );
}
