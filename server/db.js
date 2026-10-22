import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Check Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project') && !supabaseKey.includes('your-'));

let supabase = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized successfully.');
  } catch (err) {
    console.error('⚠️ Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('ℹ️ Supabase credentials not set. Running with local persistent file storage (server/data/store.json).');
}

// Default in-memory & file store structure
const defaultStore = {
  profile: {
    full_name: 'Dhanush',
    email: 'dhanush@example.com',
    updated_at: new Date().toISOString()
  },
  expenses: [
    {
      id: 'exp-1',
      user_email: 'dhanush@example.com',
      amount: 40,
      description: 'Tea and snacks',
      category: 'Food & Drinks',
      date: new Date().toISOString().split('T')[0],
      time: '10:30:00',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'exp-2',
      user_email: 'dhanush@example.com',
      amount: 180,
      description: 'Metro card recharge',
      category: 'Transportation',
      date: new Date().toISOString().split('T')[0],
      time: '08:45:00',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'exp-3',
      user_email: 'dhanush@example.com',
      amount: 450,
      description: 'Grocery shopping',
      category: 'Shopping',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      time: '18:15:00',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  incomes: [
    {
      id: 'inc-1',
      user_email: 'dhanush@example.com',
      amount: 25000,
      source: 'Monthly Salary',
      category: 'Salary',
      date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
      created_at: new Date(Date.now() - 86400000 * 5).toISOString()
    }
  ],
  budgets: {
    weekly_budget: 2000,
    monthly_budget: 15000,
    category_budgets: {
      'Food & Drinks': 4000,
      'Transportation': 2500,
      'Shopping': 3000,
      'Bills & Utilities': 2000,
      'Entertainment': 1500
    },
    updated_at: new Date().toISOString()
  },
  savings_goals: [
    {
      id: 'goal-1',
      user_email: 'dhanush@example.com',
      title: 'Emergency Fund',
      target_amount: 50000,
      saved_amount: 15000,
      target_date: '2026-12-31',
      created_at: new Date().toISOString()
    }
  ],
  report_settings: {
    is_active: true,
    delivery_day: 'Sunday',
    delivery_time: '09:00',
    timezone: 'Asia/Kolkata',
    last_sent_period: null,
    updated_at: new Date().toISOString()
  },
  email_logs: []
};

// Local file helper
function readLocalStore() {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      fs.writeFileSync(STORE_FILE, JSON.stringify(defaultStore, null, 2), 'utf-8');
      return defaultStore;
    }
    const data = fs.readFileSync(STORE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading local store:', err.message);
    return defaultStore;
  }
}

function writeLocalStore(store) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local store:', err.message);
  }
}

// DATA LAYER METHODS
export const db = {
  getStatus() {
    return {
      storage_type: isSupabaseConfigured ? 'supabase' : 'local_storage',
      supabase_configured: isSupabaseConfigured,
      supabase_url: isSupabaseConfigured ? supabaseUrl : null,
      resend_configured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')),
      sender_email: process.env.SENDER_EMAIL || 'Expense Tracker <onboarding@resend.dev>'
    };
  },

  // 1. PROFILE
  async getProfile() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) return data;
      } catch (err) {
        console.warn('Supabase profile query failed, using local fallback:', err.message);
      }
    }
    const store = readLocalStore();
    return store.profile;
  },

  async saveProfile({ full_name, email }) {
    const updated = {
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .upsert(updated, { onConflict: 'email' })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase profile upsert failed, saving locally:', err.message);
      }
    }

    const store = readLocalStore();
    store.profile = updated;
    writeLocalStore(store);
    return updated;
  },

  // 2. EXPENSES
  async getExpenses(userEmail) {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('expenses').select('*').order('date', { ascending: false }).order('time', { ascending: false });
        if (userEmail) query = query.eq('user_email', userEmail);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Supabase expenses query failed, using local fallback:', err.message);
      }
    }
    const store = readLocalStore();
    let exps = store.expenses || [];
    if (userEmail) {
      exps = exps.filter(e => e.user_email.toLowerCase() === userEmail.toLowerCase());
    }
    return exps.sort((a, b) => new Date(`${b.date}T${b.time || '00:00:00'}`) - new Date(`${a.date}T${a.time || '00:00:00'}`));
  },

  async addExpense(expense) {
    const newRecord = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      user_email: expense.user_email,
      amount: Number(expense.amount),
      description: expense.description.trim(),
      category: expense.category || 'Other',
      date: expense.date || new Date().toISOString().split('T')[0],
      time: expense.time || new Date().toTimeString().split(' ')[0],
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('expenses').insert(newRecord).select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase add expense failed, saving locally:', err.message);
      }
    }

    const store = readLocalStore();
    store.expenses.unshift(newRecord);
    writeLocalStore(store);
    return newRecord;
  },

  async updateExpense(id, updates) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('expenses').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase update expense failed, updating locally:', err.message);
      }
    }

    const store = readLocalStore();
    const index = store.expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      store.expenses[index] = { ...store.expenses[index], ...updates };
      writeLocalStore(store);
      return store.expenses[index];
    }
    throw new Error('Expense not found');
  },

  async deleteExpense(id) {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.warn('Supabase delete expense failed, deleting locally:', err.message);
      }
    }

    const store = readLocalStore();
    store.expenses = store.expenses.filter(e => e.id !== id);
    writeLocalStore(store);
    return { success: true };
  },

  // 3. INCOMES
  async getIncomes(userEmail) {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('incomes').select('*').order('date', { ascending: false });
        if (userEmail) query = query.eq('user_email', userEmail);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Supabase income query failed, using local fallback:', err.message);
      }
    }
    const store = readLocalStore();
    let incs = store.incomes || [];
    if (userEmail) {
      incs = incs.filter(i => i.user_email.toLowerCase() === userEmail.toLowerCase());
    }
    return incs.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async addIncome(income) {
    const newRecord = {
      id: 'inc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      user_email: income.user_email,
      amount: Number(income.amount),
      source: income.source.trim(),
      category: income.category || 'Salary',
      date: income.date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('incomes').insert(newRecord).select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase add income failed, saving locally:', err.message);
      }
    }

    const store = readLocalStore();
    store.incomes.unshift(newRecord);
    writeLocalStore(store);
    return newRecord;
  },

  async updateIncome(id, updates) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('incomes').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase update income failed, updating locally:', err.message);
      }
    }

    const store = readLocalStore();
    const index = store.incomes.findIndex(i => i.id === id);
    if (index !== -1) {
      store.incomes[index] = { ...store.incomes[index], ...updates };
      writeLocalStore(store);
      return store.incomes[index];
    }
    throw new Error('Income not found');
  },

  async deleteIncome(id) {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('incomes').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.warn('Supabase delete income failed, deleting locally:', err.message);
      }
    }

    const store = readLocalStore();
    store.incomes = store.incomes.filter(i => i.id !== id);
    writeLocalStore(store);
    return { success: true };
  },

  // 4. BUDGETS
  async getBudgets(userEmail) {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('budget_settings').select('*');
        if (userEmail) query = query.eq('user_email', userEmail);
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        if (data) return data;
      } catch (err) {
        console.warn('Supabase budget query failed, using local fallback:', err.message);
      }
    }
    const store = readLocalStore();
    return store.budgets || { weekly_budget: null, monthly_budget: null, category_budgets: {} };
  },

  async saveBudgets(userEmail, budgets) {
    const payload = {
      weekly_budget: budgets.weekly_budget !== null && budgets.weekly_budget !== undefined ? Number(budgets.weekly_budget) : null,
      monthly_budget: budgets.monthly_budget !== null && budgets.monthly_budget !== undefined ? Number(budgets.monthly_budget) : null,
      category_budgets: budgets.category_budgets || {},
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('budget_settings')
          .upsert({ user_email: userEmail, ...payload }, { onConflict: 'user_email' })
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase budget upsert failed, saving locally:', err.message);
      }
    }

    const store = readLocalStore();
    store.budgets = payload;
    writeLocalStore(store);
    return payload;
  },

  // 5. SAVINGS GOALS
  async getSavingsGoals(userEmail) {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('savings_goals').select('*').order('created_at', { ascending: false });
        if (userEmail) query = query.eq('user_email', userEmail);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Supabase goals query failed, using local fallback:', err.message);
      }
    }
    const store = readLocalStore();
    return store.savings_goals || [];
  },

  async addSavingsGoal(goal) {
    const newGoal = {
      id: 'goal-' + Date.now(),
      user_email: goal.user_email,
      title: goal.title.trim(),
      target_amount: Number(goal.target_amount),
      saved_amount: Number(goal.saved_amount || 0),
      target_date: goal.target_date || null,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('savings_goals').insert(newGoal).select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase add goal failed, saving locally:', err.message);
      }
    }

    const store = readLocalStore();
    store.savings_goals = store.savings_goals || [];
    store.savings_goals.unshift(newGoal);
    writeLocalStore(store);
    return newGoal;
  },

  async updateSavingsGoal(id, updates) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('savings_goals').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase update goal failed, updating locally:', err.message);
      }
    }

    const store = readLocalStore();
    const index = store.savings_goals.findIndex(g => g.id === id);
    if (index !== -1) {
      store.savings_goals[index] = { ...store.savings_goals[index], ...updates };
      writeLocalStore(store);
      return store.savings_goals[index];
    }
    throw new Error('Goal not found');
  },

  async deleteSavingsGoal(id) {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('savings_goals').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.warn('Supabase delete goal failed, deleting locally:', err.message);
      }
    }

    const store = readLocalStore();
    store.savings_goals = (store.savings_goals || []).filter(g => g.id !== id);
    writeLocalStore(store);
    return { success: true };
  },

  // 6. WEEKLY REPORT SETTINGS
  async getReportSettings(userEmail) {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('weekly_report_settings').select('*');
        if (userEmail) query = query.eq('user_email', userEmail);
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        if (data) return data;
      } catch (err) {
        console.warn('Supabase report settings query failed, using local fallback:', err.message);
      }
    }
    const store = readLocalStore();
    return store.report_settings || {
      is_active: true,
      delivery_day: 'Sunday',
      delivery_time: '09:00',
      timezone: 'Asia/Kolkata',
      last_sent_period: null
    };
  },

  async saveReportSettings(userEmail, settings) {
    const payload = {
      is_active: Boolean(settings.is_active),
      delivery_day: settings.delivery_day || 'Sunday',
      delivery_time: settings.delivery_time || '09:00',
      timezone: settings.timezone || 'Asia/Kolkata',
      last_sent_period: settings.last_sent_period || null,
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('weekly_report_settings')
          .upsert({ user_email: userEmail, ...payload }, { onConflict: 'user_email' })
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase report settings upsert failed, saving locally:', err.message);
      }
    }

    const store = readLocalStore();
    store.report_settings = { ...store.report_settings, ...payload };
    writeLocalStore(store);
    return store.report_settings;
  },

  // 7. EMAIL LOGS
  async getEmailLogs(userEmail) {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('email_delivery_logs').select('*').order('sent_at', { ascending: false }).limit(50);
        if (userEmail) query = query.eq('user_email', userEmail);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Supabase email logs query failed, using local fallback:', err.message);
      }
    }
    const store = readLocalStore();
    let logs = store.email_logs || [];
    if (userEmail) {
      logs = logs.filter(l => l.user_email && l.user_email.toLowerCase() === userEmail.toLowerCase());
    }
    return logs.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  },

  async addEmailLog(log) {
    const newLog = {
      id: 'log-' + Date.now(),
      user_email: log.user_email,
      recipient: log.recipient,
      period_start: log.period_start,
      period_end: log.period_end,
      status: log.status, // 'SUCCESS' | 'FAILED'
      total_expense: Number(log.total_expense || 0),
      total_income: Number(log.total_income || 0),
      transactions_count: Number(log.transactions_count || 0),
      error_message: log.error_message || null,
      sent_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('email_delivery_logs').insert(newLog).select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase add email log failed, saving locally:', err.message);
      }
    }

    const store = readLocalStore();
    store.email_logs = store.email_logs || [];
    store.email_logs.unshift(newLog);
    // Keep last 100 logs
    if (store.email_logs.length > 100) {
      store.email_logs = store.email_logs.slice(0, 100);
    }
    writeLocalStore(store);
    return newLog;
  }
};
