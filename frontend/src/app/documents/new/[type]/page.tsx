'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getClients, createInvoice, getToken } from '@/lib/api';

type LineItem = { description: string; quantity: string; unit_price_naira: string };

const VALID_TYPES = ['invoice', 'receipt', 'quotation'];

export default function NewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const docType = (params.type as string) || 'invoice';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: getClients, enabled: mounted });
  const clients = clientsData?.clients ?? [];

  const [clientId, setClientId] = useState('');
  const [billToName, setBillToName] = useState('');
  const [billToEmail, setBillToEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: '1', unit_price_naira: '' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!mounted || !VALID_TYPES.includes(docType)) return null;

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: '', quantity: '1', unit_price_naira: '' }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price_naira) || 0),
    0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!clientId) {
      setError('Please select a client');
      return;
    }
    if (items.some((i) => !i.description || !i.unit_price_naira)) {
      setError('Please fill in all line items');
      return;
    }

    setLoading(true);
    try {
      const result = await createInvoice({
        client_id: Number(clientId),
        document_type: docType,
        bill_to_name: billToName,
        bill_to_email: billToEmail || undefined,
        due_date: dueDate || undefined,
        items: items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit_price_naira: Number(i.unit_price_naira),
        })),
      });
      router.push(`/documents/${result.invoice_id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  }

  const typeLabel = docType === 'quotation' ? 'Quotation' : docType === 'receipt' ? 'Receipt' : 'Invoice';

  return (
    <main className="max-w-3xl px-8 py-8">
      <a href="/documents" className="text-sm font-medium mb-4 inline-block" style={{ color: 'var(--primary)' }}>
        ← Back to Documents
      </a>
      <h1 className="font-display text-2xl font-bold mb-6">New {typeLabel}</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="input-field">
              <option value="">Select a client</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>{c.business_name}</option>
              ))}
            </select>
            {clients.length === 0 && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-faint)' }}>
                No clients yet. <a href="/clients" style={{ color: 'var(--primary)' }}>Add one first →</a>
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Bill To (Customer Name)</label>
            <input
              type="text"
              required
              value={billToName}
              onChange={(e) => setBillToName(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-2">Customer Email (optional)</label>
              <input
                type="email"
                value={billToEmail}
                onChange={(e) => setBillToEmail(e.target.value)}
                className="input-field"
              />
            </div>
            {docType === 'invoice' && (
              <div>
                <label className="text-sm font-medium block mb-2">Due Date (optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input-field"
                />
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm">Line Items</h2>
            <button type="button" onClick={addItem} className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              + Add item
            </button>
          </div>

          <div className="space-y-5">
            {items.map((item, i) => (
              <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--surface-subtle)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
                    Item {i + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      aria-label="Remove item"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="var(--danger)" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="mb-3">
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Description of goods or services
                  </label>
                  <textarea
                    placeholder="e.g. Website design and development, 2 rounds of revisions included"
                    value={item.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    className="input-field"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Unit Price (₦)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={item.unit_price_naira}
                      onChange={(e) => updateItem(i, 'unit_price_naira', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 flex justify-between text-sm font-medium" style={{ borderTop: '1px solid var(--surface-border)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Subtotal (before VAT)</span>
            <span>₦{subtotal.toLocaleString()}</span>
          </div>
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? `Creating ${typeLabel}...` : `Create ${typeLabel}`}
        </button>
      </form>
    </main>
  );
}
