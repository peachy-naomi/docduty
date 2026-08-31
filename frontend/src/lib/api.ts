import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('docduty_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function saveToken(token: string) {
  localStorage.setItem('docduty_token', token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('docduty_token');
}

export function clearToken() {
  localStorage.removeItem('docduty_token');
}

// ---- Auth ----
export async function signup(payload: {
  email: string;
  password: string;
  full_name: string;
  account_type: string;
  business_name: string;
}) {
  const res = await api.post('/signup', payload);
  return res.data;
}

export async function login(email: string, password: string) {
  const res = await api.post('/login', { email, password });
  return res.data;
}

export async function verifyEmail(token: string) {
  const res = await api.get(`/verify-email?token=${token}`);
  return res.data;
}

export async function getMe() {
  const res = await api.get('/me');
  return res.data;
}

// ---- Chat ----
export async function sendChatMessage(message: string, sessionId: number | null) {
  const res = await api.post('/chat', { message, session_id: sessionId });
  return res.data;
}

export async function getChatSessions() {
  const res = await api.get('/chat/sessions');
  return res.data;
}

export async function getChatSession(sessionId: number) {
  const res = await api.get(`/chat/sessions/${sessionId}`);
  return res.data;
}

export async function deleteChatSession(sessionId: number) {
  const res = await api.delete(`/chat/sessions/${sessionId}`);
  return res.data;
}

// ---- Clients ----
export async function getClients() {
  const res = await api.get('/clients');
  return res.data;
}

// ---- Invoices ----
export async function getInvoices() {
  const res = await api.get('/invoices');
  return res.data;
}

// ---- Deadlines ----
export async function getDeadlines() {
  const res = await api.get('/deadlines');
  return res.data;
}

// ---- Billing ----
export async function getBillingStatus() {
  const res = await api.get('/billing/status');
  return res.data;
}

export async function startSubscription() {
  const res = await api.post('/billing/subscribe');
  return res.data;
}

export async function logout() {
  clearToken();
}

export async function generatePaymentLink(invoiceId: number) {
  const res = await api.post(`/invoices/${invoiceId}/payment-link`);
  return res.data;
}

export async function getPublicInvoice(shareToken: string) {
  const res = await api.get(`/public/invoices/${shareToken}`);
  return res.data;
}

export async function verifyPublicPayment(shareToken: string) {
  const res = await api.get(`/public/invoices/${shareToken}/verify`);
  return res.data;
}

export async function getProfile() {
  const res = await api.get('/profile');
  return res.data;
}

export async function updateProfile(payload: { full_name?: string; phone_number?: string; business_name?: string; logo_url?: string; brand_color?: string }) {
  const res = await api.put('/profile', payload);
  return res.data;
}

export async function createInvoice(payload: {
  client_id: number;
  document_type: string;
  bill_to_name: string;
  bill_to_email?: string;
  due_date?: string;
  items: { description: string; quantity: number; unit_price_naira: number }[];
}) {
  const res = await api.post('/invoices', payload);
  return res.data;
}

export async function getInvoiceDetail(id: number) {
  const res = await api.get(`/invoices/${id}`);
  return res.data;
}

export async function createClient(payload: {
  business_name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
}) {
  const res = await api.post('/clients', payload);
  return res.data;
}

export async function calculateVAT(amountNaira: number) {
  const res = await api.post('/calculators/vat', { amount_naira: amountNaira });
  return res.data;
}

export async function getCalculatorCategories(rateType: string) {
  const res = await api.get(`/calculators/${rateType}/categories`);
  return res.data;
}

export async function calculateCategoryBased(rateType: string, categoryName: string, amountNaira?: number) {
  const endpoint = rateType === 'stamp_duty' ? 'stamp-duty' : rateType;
  const res = await api.post(`/calculators/${endpoint}`, {
    category_name: categoryName,
    amount_naira: amountNaira,
  });
  return res.data;
}

export async function calculatePAYE(annualIncomeNaira: number) {
  const res = await api.post('/calculators/paye', { annual_income_naira: annualIncomeNaira });
  return res.data;
}

export async function createDeadline(payload: {
  client_id: number;
  deadline_type: string;
  description?: string;
  due_date: string;
  recurrence: string;
  reminder_days_before: number;
}) {
  const res = await api.post('/deadlines', payload);
  return res.data;
}

export async function completeDeadline(id: number) {
  const res = await api.put(`/deadlines/${id}/complete`);
  return res.data;
}

export async function getContractTemplates() {
  const res = await api.get('/contract-templates');
  return res.data;
}

export async function createContract(payload: { client_id: number; template_id: number; field_values: Record<string, any> }) {
  const res = await api.post('/contracts', payload);
  return res.data;
}

export async function downloadContractPdfUrl(contractId: number) {
  const token = getToken();
  return `${process.env.NEXT_PUBLIC_API_URL}/contracts/${contractId}/pdf?token=${token}`;
}

export async function getRateHistory(rateType: string) {
  const res = await api.get(`/rates/${rateType}/history`);
  return res.data;
}

export async function createRate(payload: { rate_type: string; rate_data: any; effective_date: string; notes?: string }) {
  const res = await api.post('/admin/rates', payload);
  return res.data;
}

export async function getRateAlerts() {
  const res = await api.get('/admin/rate-alerts');
  return res.data;
}

export async function reviewRateAlert(alertId: number) {
  const res = await api.put(`/admin/rate-alerts/${alertId}/review`);
  return res.data;
}

export async function forgotPassword(email: string) {
  const res = await api.post('/forgot-password', { email });
  return res.data;
}

export async function resetPassword(token: string, newPassword: string) {
  const res = await api.post('/reset-password', { token, new_password: newPassword });
  return res.data;
}

export async function getAdminUsers() {
  const res = await api.get('/admin/users');
  return res.data;
}

export async function getAuditLog() {
  const res = await api.get('/admin/audit-log');
  return res.data;
}

export async function createTemplate(payload: { name: string; slug: string; fields: any[]; body_template: string }) {
  const res = await api.post('/admin/contract-templates', payload);
  return res.data;
}

export async function updateTemplate(id: number, payload: { name: string; slug: string; fields: any[]; body_template: string }) {
  const res = await api.put(`/admin/contract-templates/${id}`, payload);
  return res.data;
}

export async function getHealthScore() {
  const res = await api.get('/health-score');
  return res.data;
}

export async function verifyDocument(type: 'invoice' | 'contract', id: number) {
  const res = await api.get(`/public/verify/${type}/${id}`);
  return res.data;
}

export async function runComplianceAnalysis() {
  const res = await api.post('/compliance/analyze');
  return res.data;
}

export async function getComplianceRequirements() {
  const res = await api.get('/compliance/requirements');
  return res.data;
}

export async function googleAuth(credential: string, accountType?: string, businessName?: string) {
  const res = await api.post('/auth/google', {
    credential,
    account_type: accountType,
    business_name: businessName,
  });
  return res.data;
}
