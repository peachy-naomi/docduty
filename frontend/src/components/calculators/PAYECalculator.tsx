'use client';

import { useState } from 'react';
import { calculatePAYE } from '@/lib/api';

export default function PAYECalculator() {
  const [income, setIncome] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await calculatePAYE(Number(income));
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'PAYE bands have not been configured yet.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <form onSubmit={handleCalculate} className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-2">Annual Income (₦)</label>
          <input
            type="number"
            required
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="input-field font-mono text-lg"
          />
        </div>
        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Calculating...' : 'Calculate PAYE'}
        </button>
      </form>

      {result && (
        <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--surface-border)' }}>
          <div className="space-y-1.5 mb-3">
            {result.breakdown.map((band: any, i: number) => (
              <div key={i} className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{band.band_rate_percent}% on ₦{band.taxable_amount_naira.toLocaleString()}</span>
                <span>₦{band.tax_naira.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 space-y-1" style={{ borderTop: '1px solid var(--surface-border)' }}>
            <div className="flex justify-between text-sm font-semibold">
              <span>Total Tax</span>
              <span>₦{result.total_tax_naira.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
              <span>Net Income</span>
              <span>₦{result.net_income_naira.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
