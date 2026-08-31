'use client';

import { useState } from 'react';
import { calculateVAT } from '@/lib/api';

export default function VATCalculator() {
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await calculateVAT(Number(amount));
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <form onSubmit={handleCalculate} className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-2">Amount (₦)</label>
          <input
            type="number"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field font-mono text-lg"
          />
        </div>
        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Calculating...' : 'Calculate VAT'}
        </button>
      </form>

      {result && (
        <div className="mt-5 pt-5 space-y-2" style={{ borderTop: '1px solid var(--surface-border)' }}>
          <Row label="Amount" value={`₦${result.amount_naira.toLocaleString()}`} />
          <Row label={`VAT (${result.vat_rate_percent}%)`} value={`₦${result.vat_amount_naira.toLocaleString()}`} />
          <Row label="Total" value={`₦${result.total_naira.toLocaleString()}`} bold />
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold text-base' : ''}`} style={{ color: bold ? 'var(--text-primary)' : 'var(--text-muted)' }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
