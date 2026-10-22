import {
  Profile,
  Expense,
  Income,
  BudgetSettings,
  SavingsGoal,
  WeeklyReportSettings,
  WeeklySummary,
  EmailLog,
  SystemStatus
} from '../types';

const API_BASE = '/api';

function getCurrentUserEmail(): string {
  try {
    const cached = localStorage.getItem('expense_tracker_profile');
    if (cached) {
      const p = JSON.parse(cached);
      return (p?.email || '').trim().toLowerCase();
    }
  } catch {}
  return '';
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const email = getCurrentUserEmail();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(email ? { 'X-User-Email': email } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData.error) errorMsg = errData.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // System Status
  getStatus: () => fetchJson<SystemStatus>(`${API_BASE}/status`),

  // Profile
  getProfile: (email?: string) =>
    fetchJson<Profile>(`${API_BASE}/profile${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  saveProfile: (data: { full_name: string; email: string }) =>
    fetchJson<{ success: boolean; profile: Profile }>(`${API_BASE}/profile`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Expenses
  getExpenses: (email?: string) =>
    fetchJson<Expense[]>(`${API_BASE}/expenses${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  addExpense: (data: { amount: number; description: string; category?: string; date?: string; time?: string; user_email?: string }) =>
    fetchJson<Expense>(`${API_BASE}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateExpense: (id: string, data: Partial<Expense>) =>
    fetchJson<Expense>(`${API_BASE}/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteExpense: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
    }),

  // Incomes
  getIncomes: (email?: string) =>
    fetchJson<Income[]>(`${API_BASE}/incomes${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  addIncome: (data: { amount: number; source: string; category?: string; date?: string; user_email?: string }) =>
    fetchJson<Income>(`${API_BASE}/incomes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateIncome: (id: string, data: Partial<Income>) =>
    fetchJson<Income>(`${API_BASE}/incomes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteIncome: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/incomes/${id}`, {
      method: 'DELETE',
    }),

  // Budgets
  getBudgets: (email?: string) =>
    fetchJson<BudgetSettings>(`${API_BASE}/budgets${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  saveBudgets: (data: BudgetSettings, email?: string) =>
    fetchJson<BudgetSettings>(`${API_BASE}/budgets${email ? `?email=${encodeURIComponent(email)}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Savings Goals
  getGoals: (email?: string) =>
    fetchJson<SavingsGoal[]>(`${API_BASE}/goals${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  addGoal: (data: { title: string; target_amount: number; saved_amount?: number; target_date?: string | null; user_email?: string }) =>
    fetchJson<SavingsGoal>(`${API_BASE}/goals`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateGoal: (id: string, data: Partial<SavingsGoal>) =>
    fetchJson<SavingsGoal>(`${API_BASE}/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteGoal: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/goals/${id}`, {
      method: 'DELETE',
    }),

  // Reports & Emails
  getReportSettings: (email?: string) =>
    fetchJson<WeeklyReportSettings>(`${API_BASE}/reports/settings${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  saveReportSettings: (data: Partial<WeeklyReportSettings>, email?: string) =>
    fetchJson<WeeklyReportSettings>(`${API_BASE}/reports/settings${email ? `?email=${encodeURIComponent(email)}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getWeeklySummary: (email?: string) =>
    fetchJson<WeeklySummary>(`${API_BASE}/reports/weekly-summary${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  sendWeeklyReport: (options?: { force?: boolean; email?: string }) =>
    fetchJson<{ success: boolean; skipped?: boolean; message?: string; error?: string; summary?: WeeklySummary }>(
      `${API_BASE}/reports/send-weekly`,
      {
        method: 'POST',
        body: JSON.stringify(options || {}),
      }
    ),
  sendTestEmail: (email?: string) =>
    fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/reports/test-email`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  getEmailLogs: (email?: string) =>
    fetchJson<EmailLog[]>(`${API_BASE}/reports/logs${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  retryEmail: (id: string) =>
    fetchJson<{ success: boolean; error?: string }>(`${API_BASE}/reports/retry/${id}`, {
      method: 'POST',
    }),

  // Multi-user & Offline sync
  syncOfflineData: (data: { email: string; expenses: Expense[]; incomes: Income[] }) =>
    fetchJson<{ success: boolean; expenses: Expense[]; incomes: Income[] }>(`${API_BASE}/sync`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Client-side category detection matching backend logic
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'PhonePe': [
    'phonepe', 'phone pay', 'phonepay', 'upi', 'gpay', 'google pay', 'paytm', 'online', 'qr', 'scan'
  ],
  'Cash': [
    'cash', 'liquid cash', 'atm', 'withdrawal', 'hand cash', 'in hand', 'petty cash'
  ],
  'Food & Drinks': [
    'tea', 'coffee', 'chai', 'snack', 'snacks', 'lunch', 'dinner', 'breakfast',
    'pizza', 'burger', 'food', 'restaurant', 'cafe', 'swiggy', 'zomato',
    'mcdonalds', 'kfc', 'starbucks', 'biryani', 'bread', 'milk', 'egg', 'fruits',
    'vegetables', 'juice', 'beer', 'drinks', 'water', 'biscuit', 'cookies', 'bakery'
  ],
  'Transportation': [
    'uber', 'ola', 'rapido', 'auto', 'cab', 'taxi', 'metro', 'bus', 'train',
    'fuel', 'petrol', 'diesel', 'toll', 'flight', 'ticket', 'parking', 'railway', 'irctc'
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'shirt', 'pants', 'tshirt',
    'grocery', 'groceries', 'supermarket', 'mall', 'electronics', 'books', 'watch', 'bag'
  ],
  'Bills & Utilities': [
    'electricity', 'power', 'water bill', 'wifi', 'internet', 'broadband',
    'recharge', 'mobile bill', 'airtel', 'jio', 'rent', 'gas', 'lpg', 'maintenance'
  ],
  'Entertainment': [
    'movie', 'movies', 'cinema', 'theatre', 'netflix', 'prime', 'spotify',
    'hotstar', 'game', 'gaming', 'concert', 'party', 'outing', 'club'
  ],
  'Health & Wellness': [
    'doctor', 'hospital', 'medicine', 'pharmacy', 'clinic', 'dentist', 'gym',
    'fitness', 'supplement', 'therapy', 'medical', 'test', 'blood test'
  ],
  'Education': [
    'course', 'tuition', 'fee', 'books', 'school', 'college', 'udemy', 'coursera', 'exam'
  ]
};

export function clientDetectCategory(description: string): string {
  if (!description) return 'Other';
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(lower) || lower.includes(kw)) {
        return category;
      }
    }
  }
  return 'Other';
}

export function formatINR(val: number | null | undefined): string {
  if (val === null || val === undefined) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
