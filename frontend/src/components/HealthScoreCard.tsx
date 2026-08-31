'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getHealthScore, runComplianceAnalysis } from '@/lib/api';

export default function HealthScoreCard() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['health-score'], queryFn: getHealthScore });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!data) return null;

  const scoreColor = data.score >= 75 ? 'var(--success)' : data.score >= 50 ? 'var(--warning)' : 'var(--danger)';

  async function handleAnalyze() {
    setError('');
    setLoading(true);
    try {
      await runComplianceAnalysis();
      queryClient.invalidateQueries({ queryKey: ['health-score'] });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-semibold text-sm">Compliance Health</h2>
        <span className="font-display text-2xl font-bold" style={{ color: scoreColor }}>{data.score}%</span>
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>
        {data.personalized ? 'Based on your business profile' : 'General checklist — run analysis for a personalized result'}
      </p>

      <div className="w-full h-2 rounded-full overflow-hidden mb-5" style={{ background: 'var(--surface-subtle)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${data.score}%`, background: scoreColor }}
        />
      </div>

      <div className="space-y-2.5 mb-5">
        {Object.values(data.checks).map((check: any, i: number) => (
          <div key={i} className="flex items-start gap-2.5">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: check.passed ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.1)' }}
            >
              {check.passed ? (
                <svg className="w-2.5 h-2.5" fill="none" stroke="var(--success)" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-2.5 h-2.5" fill="none" stroke="var(--danger)" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              )}
            </div>
            <span className="text-xs" style={{ color: check.passed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
              {check.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}>
          {error}
        </p>
      )}

      <button onClick={handleAnalyze} disabled={loading} className="btn-accent w-full text-xs">
        {loading ? 'Analyzing...' : data.personalized ? 'Re-run Analysis' : 'Run Personalized Analysis'}
      </button>
    </div>
  );
}
