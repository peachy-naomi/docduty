'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getClients, getContractTemplates, createContract, getToken } from '@/lib/api';

export default function NewContractPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [clientId, setClientId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: getClients, enabled: mounted });
  const { data: templatesData } = useQuery({ queryKey: ['contract-templates'], queryFn: getContractTemplates, enabled: mounted });
  const clients = clientsData?.clients ?? [];
  const templates = templatesData?.templates ?? [];
  const selectedTemplate = templates.find((t: any) => String(t.id) === templateId);

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    setFieldValues({});
  }

  function updateField(name: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!clientId || !templateId) {
      setError('Please select a client and document type');
      return;
    }

    setLoading(true);
    try {
      const result = await createContract({
        client_id: Number(clientId),
        template_id: Number(templateId),
        field_values: fieldValues,
      });
      router.push(`/documents/contracts/${result.contract_id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate document');
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <main className="max-w-3xl px-8 py-8">
      <a href="/documents" className="text-sm font-medium mb-4 inline-block" style={{ color: 'var(--primary)' }}>
        ← Back to Documents
      </a>
      <h1 className="font-display text-2xl font-bold mb-6">New Contract or Policy</h1>

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
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Document Type</label>
            <select value={templateId} onChange={(e) => handleTemplateChange(e.target.value)} required className="input-field">
              <option value="">Select a document type</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedTemplate && (
          <div className="card p-6 space-y-4">
            <h2 className="font-display font-semibold text-sm mb-1">{selectedTemplate.name} Details</h2>
            {selectedTemplate.fields.map((field: any) => (
              <div key={field.name}>
                <label className="text-sm font-medium block mb-2">{field.label}</label>
                {field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={fieldValues[field.name] === 'true'}
                      onChange={(e) => updateField(field.name, e.target.checked ? 'true' : 'false')}
                      className="w-4 h-4"
                    />
                    Yes
                  </label>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={fieldValues[field.name] || ''}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    className="input-field"
                    rows={3}
                  />
                ) : (
                  <input
                    type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                    value={fieldValues[field.name] || ''}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    className="input-field"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.08)' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading || !selectedTemplate} className="btn-primary w-full">
          {loading ? 'Generating...' : 'Generate Document'}
        </button>
      </form>
    </main>
  );
}
