'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCalculatorCategories, calculateCategoryBased } from '@/lib/api';

export default function CategoryCalculator({ rateType, label }: { rateType: string; label: string }) {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: categoriesData, isError: categoriesError } = useQuery({
    queryKey: ['calc-categories', rateType],
    queryFn: () => getCalculatorCategories(rateType),
    retry: false,
  });

  useEffect(() => {
    setCategory('');
    setResult(null);
    setError('');
  }, [rateType]);

  const categories = categoriesData?.categories ?? [];
  const selectedCategory = categories.find((c: any) => c.name === category);
  const needsAmount = selectedCategory?.type === 'percent';

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await calculateCategoryBased(rateType, category, needsAmount ? Number(amount) : undefined);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  }

  if (categoriesError) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
          {label} rates haven&apos;t been configured yet. Check back once your admin adds current rates.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <form onSubmit={handleCalculate} className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-2">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} required className="input-field">
            <option value="">Select a category</option>
            {categories.map((c: any) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {needsAmount && (
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
        )}

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading || !category} className="btn-primary w-full">
          {loading ? 'Calculating...' : `Calculate ${label}`}
        </button>
      </form>

      {result && (
        <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--surface-border)' }}>
          <div className="flex justify-between font-semibold text-base mb-2">
            <span>{result.category}</span>
            <span>₦{result.fee_naira.toLocaleString()}</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>As of {result.as_of}</p>
          {result.notes && (
            <p className="text-xs mt-2 px-3 py-2 rounded-lg" style={{ color: 'var(--warning)', background: 'rgba(217,119,6,0.08)' }}>
              {result.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
