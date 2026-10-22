import React, { useState, useEffect } from 'react';
import {
  Navbar
} from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { Analytics } from './components/Analytics';
import { Transactions } from './components/Transactions';
import { Budgets } from './components/Budgets';
import { IncomeAndGoals } from './components/IncomeAndGoals';
import { CalendarView } from './components/CalendarView';
import { WeeklyReports } from './components/WeeklyReports';
import { ProfileModal } from './components/ProfileModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { AddIncomeModal } from './components/AddIncomeModal';
import { ChangeWeeklyBudgetModal } from './components/ChangeWeeklyBudgetModal';

import {
  Profile,
  Expense,
  Income,
  BudgetSettings,
  SavingsGoal,
  WeeklyReportSettings,
  SystemStatus
} from './types';
import { api } from './services/api';
import { Database, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

function getCachedEmail(): string {
  try {
    const raw = localStorage.getItem('expense_tracker_profile');
    if (raw) {
      const p = JSON.parse(raw);
      return (p?.email || '').trim().toLowerCase();
    }
  } catch {}
  return '';
}

function getStoredList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredData(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const cached = localStorage.getItem('expense_tracker_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const email = getCachedEmail();
    if (email) {
      const list = getStoredList<Expense>(`expense_tracker_expenses_${email}`);
      if (list.length > 0) return list;
    }
    return getStoredList<Expense>('expense_tracker_expenses');
  });

  const [incomes, setIncomes] = useState<Income[]>(() => {
    const email = getCachedEmail();
    if (email) {
      const list = getStoredList<Income>(`expense_tracker_incomes_${email}`);
      if (list.length > 0) return list;
    }
    return getStoredList<Income>('expense_tracker_incomes');
  });

  const [budgets, setBudgets] = useState<BudgetSettings>(() => {
    const email = getCachedEmail();
    if (email) {
      try {
        const cached = localStorage.getItem(`expense_tracker_budgets_${email}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    try {
      const cached = localStorage.getItem('expense_tracker_budgets');
      return cached ? JSON.parse(cached) : {
        weekly_budget: null,
        monthly_budget: null,
        category_budgets: {}
      };
    } catch {
      return {
        weekly_budget: null,
        monthly_budget: null,
        category_budgets: {}
      };
    }
  });

  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    const email = getCachedEmail();
    if (email) {
      const list = getStoredList<SavingsGoal>(`expense_tracker_goals_${email}`);
      if (list.length > 0) return list;
    }
    return getStoredList<SavingsGoal>('expense_tracker_goals');
  });

  const [reportSettings, setReportSettings] = useState<WeeklyReportSettings>({
    is_active: true,
    delivery_day: 'Sunday',
    delivery_time: '00:00',
    timezone: 'Asia/Kolkata',
    last_sent_period: null
  });
  const [status, setStatus] = useState<SystemStatus | null>(null);

  // Modals & Controls
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangeWeeklyBudgetOpen, setIsChangeWeeklyBudgetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Initial Data Fetching & Sync
  const fetchAllData = async (targetEmail?: string) => {
    try {
      setIsLoading(true);
      const activeEmail = (
        targetEmail ||
        profile?.email ||
        getCachedEmail()
      ).trim().toLowerCase();

      // Immediately restore from local storage cache if we have an email
      if (activeEmail) {
        const cachedExp = getStoredList<Expense>(`expense_tracker_expenses_${activeEmail}`);
        const cachedInc = getStoredList<Income>(`expense_tracker_incomes_${activeEmail}`);
        const cachedGoals = getStoredList<SavingsGoal>(`expense_tracker_goals_${activeEmail}`);
        if (cachedExp.length > 0) setExpenses(cachedExp);
        if (cachedInc.length > 0) setIncomes(cachedInc);
        if (cachedGoals.length > 0) setGoals(cachedGoals);
        try {
          const cachedBudg = localStorage.getItem(`expense_tracker_budgets_${activeEmail}`);
          if (cachedBudg) setBudgets(JSON.parse(cachedBudg));
        } catch {}
      }

      const [
        sysStatus,
        prof,
        expList,
        incList,
        budg,
        gList,
        repSet
      ] = await Promise.all([
        api.getStatus().catch(() => null),
        api.getProfile(activeEmail || undefined).catch(() => null),
        api.getExpenses(activeEmail || undefined).catch(() => []),
        api.getIncomes(activeEmail || undefined).catch(() => []),
        api.getBudgets(activeEmail || undefined).catch(() => ({ weekly_budget: null, monthly_budget: null, category_budgets: {} })),
        api.getGoals(activeEmail || undefined).catch(() => []),
        api.getReportSettings(activeEmail || undefined).catch(() => ({
          is_active: true,
          delivery_day: 'Sunday',
          delivery_time: '00:00',
          timezone: 'Asia/Kolkata',
          last_sent_period: null
        }))
      ]);

      if (sysStatus) setStatus(sysStatus);

      // Determine effective email and profile
      const effectiveEmail = activeEmail || (prof?.email || '').trim().toLowerCase();
      if (prof && prof.email) {
        setProfile(prof);
        setStoredData('expense_tracker_profile', prof);
        localStorage.setItem('expense_tracker_account_created', 'true');
      } else if (effectiveEmail) {
        const fallbackProf = { full_name: prof?.full_name || profile?.full_name || 'My Account', email: effectiveEmail };
        setProfile(fallbackProf);
        setStoredData('expense_tracker_profile', fallbackProf);
        localStorage.setItem('expense_tracker_account_created', 'true');
        api.saveProfile(fallbackProf).catch(() => {});
      }

      // Merge expenses (server + local cache) so no history is lost across restarts or logins
      let mergedExpenses: Expense[] = expList;
      if (effectiveEmail) {
        const localExp = getStoredList<Expense>(`expense_tracker_expenses_${effectiveEmail}`);
        const expMap = new Map<string, Expense>();
        localExp.forEach((e) => { if (e && e.id) expMap.set(e.id, e); });
        expList.forEach((e: Expense) => { if (e && e.id) expMap.set(e.id, e); });
        mergedExpenses = Array.from(expMap.values()).sort(
          (a, b) => new Date(`${b.date}T${b.time || '00:00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00:00'}`).getTime()
        );
        setStoredData(`expense_tracker_expenses_${effectiveEmail}`, mergedExpenses);
        setStoredData('expense_tracker_expenses', mergedExpenses);
      }
      setExpenses(mergedExpenses);

      // Merge incomes (server + local cache)
      let mergedIncomes: Income[] = incList;
      if (effectiveEmail) {
        const localInc = getStoredList<Income>(`expense_tracker_incomes_${effectiveEmail}`);
        const incMap = new Map<string, Income>();
        localInc.forEach((i) => { if (i && i.id) incMap.set(i.id, i); });
        incList.forEach((i: Income) => { if (i && i.id) incMap.set(i.id, i); });
        mergedIncomes = Array.from(incMap.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setStoredData(`expense_tracker_incomes_${effectiveEmail}`, mergedIncomes);
        setStoredData('expense_tracker_incomes', mergedIncomes);
      }
      setIncomes(mergedIncomes);

      // Two-way sync: if local had records that server is missing (e.g. Render restart/ephemeral disk wipe)
      if (effectiveEmail && (mergedExpenses.length > expList.length || mergedIncomes.length > incList.length)) {
        api.syncOfflineData({
          email: effectiveEmail,
          expenses: mergedExpenses,
          incomes: mergedIncomes
        }).catch((err) => console.warn('Offline sync background notice:', err));
      }

      // Budgets persistence: prefer server, fallback to local storage
      if (budg && (budg.weekly_budget !== null || budg.monthly_budget !== null)) {
        setBudgets(budg);
        setStoredData('expense_tracker_budgets', budg);
        if (effectiveEmail) setStoredData(`expense_tracker_budgets_${effectiveEmail}`, budg);
      } else if (effectiveEmail) {
        try {
          const cachedB = localStorage.getItem(`expense_tracker_budgets_${effectiveEmail}`);
          if (cachedB) {
            const parsedB = JSON.parse(cachedB);
            setBudgets(parsedB);
            api.saveBudgets(parsedB, effectiveEmail).catch(() => {});
          }
        } catch {}
      }

      // Goals persistence
      let mergedGoals: SavingsGoal[] = gList;
      if (effectiveEmail) {
        const localGoals = getStoredList<SavingsGoal>(`expense_tracker_goals_${effectiveEmail}`);
        const goalMap = new Map<string, SavingsGoal>();
        localGoals.forEach((g) => { if (g && g.id) goalMap.set(g.id, g); });
        gList.forEach((g: SavingsGoal) => { if (g && g.id) goalMap.set(g.id, g); });
        mergedGoals = Array.from(goalMap.values());
        setStoredData(`expense_tracker_goals_${effectiveEmail}`, mergedGoals);
        setStoredData('expense_tracker_goals', mergedGoals);
      }
      setGoals(mergedGoals);

      setReportSettings(repSet);

      // Once account is created, NEVER prompt again on restart/reload
      const hasAccount = localStorage.getItem('expense_tracker_account_created') === 'true' || Boolean(prof?.email || effectiveEmail);
      if (!hasAccount) {
        setIsProfileModalOpen(true);
      } else {
        setIsProfileModalOpen(false);
      }
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handlers
  const handleAddExpense = async (data: {
    amount: number;
    description: string;
    category?: string;
    date: string;
    time: string;
  }) => {
    const activeEmail = (profile?.email || getCachedEmail()).trim().toLowerCase();
    const created = await api.addExpense({ ...data, user_email: activeEmail || undefined });
    setExpenses((prev) => {
      const next = [created, ...prev];
      if (activeEmail) {
        setStoredData(`expense_tracker_expenses_${activeEmail}`, next);
      }
      setStoredData('expense_tracker_expenses', next);
      return next;
    });
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingItem({ ...expense, type: 'expense' });
  };

  const handleSaveEditedExpense = async (id: string, updates: Partial<Expense>) => {
    const activeEmail = (profile?.email || getCachedEmail()).trim().toLowerCase();
    const updated = await api.updateExpense(id, updates);
    setExpenses((prev) => {
      const next = prev.map((e) => (e.id === id ? updated : e));
      if (activeEmail) {
        setStoredData(`expense_tracker_expenses_${activeEmail}`, next);
      }
      setStoredData('expense_tracker_expenses', next);
      return next;
    });
    setEditingItem(null);
  };

  const handleDeleteExpense = async (id: string) => {
    const activeEmail = (profile?.email || getCachedEmail()).trim().toLowerCase();
    await api.deleteExpense(id);
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (activeEmail) {
        setStoredData(`expense_tracker_expenses_${activeEmail}`, next);
      }
      setStoredData('expense_tracker_expenses', next);
      return next;
    });
  };

  const handleAddIncome = async (data: {
    amount: number;
    source: string;
    category?: string;
    date?: string;
  }) => {
    const activeEmail = (profile?.email || getCachedEmail()).trim().toLowerCase();
    const created = await api.addIncome({ ...data, user_email: activeEmail || undefined });
    setIncomes((prev) => {
      const next = [created, ...prev];
      if (activeEmail) {
        setStoredData(`expense_tracker_incomes_${activeEmail}`, next);
      }
      setStoredData('expense_tracker_incomes', next);
      return next;
    });
  };

  const handleEditIncome = (income: Income) => {
    setEditingItem({ ...income, type: 'income' });
  };

  const handleSaveEditedIncome = async (id: string, updates: Partial<Income>) => {
    const activeEmail = (profile?.email || getCachedEmail()).trim().toLowerCase();
    const updated = await api.updateIncome(id, updates);
    setIncomes((prev) => {
      const next = prev.map((i) => (i.id === id ? updated : i));
      if (activeEmail) {
        setStoredData(`expense_tracker_incomes_${activeEmail}`, next);
      }
      setStoredData('expense_tracker_incomes', next);
      return next;
    });
    setEditingItem(null);
  };

  const handleDeleteIncome = async (id: string) => {
    const activeEmail = (profile?.email || getCachedEmail()).trim().toLowerCase();
    await api.deleteIncome(id);
    setIncomes((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (activeEmail) {
        setStoredData(`expense_tracker_incomes_${activeEmail}`, next);
      }
      setStoredData('expense_tracker_incomes', next);
      return next;
    });
  };

  const handleSaveBudgets = async (newBudgets: BudgetSettings) => {
    const activeEmail = (profile?.email || getCachedEmail()).trim().toLowerCase();
    const saved = await api.saveBudgets(newBudgets, activeEmail || undefined);
    setBudgets(saved);
    setStoredData('expense_tracker_budgets', saved);
    if (activeEmail) {
      setStoredData(`expense_tracker_budgets_${activeEmail}`, saved);
    }
  };

  const handleSaveWeeklyBudget = async (newWeeklyBudget: number | null) => {
    const updated: BudgetSettings = {
      ...budgets,
      weekly_budget: newWeeklyBudget
    };
    await handleSaveBudgets(updated);
  };

  const handleAddGoal = async (data: any) => {
    const activeEmail = (profile?.email || getCachedEmail()).trim().toLowerCase();
    const created = await api.addGoal({ ...data, user_email: activeEmail || undefined });
    setGoals((prev) => {
      const next = [created, ...prev];
      if (activeEmail) {
        setStoredData(`expense_tracker_goals_${activeEmail}`, next);
      }
      setStoredData('expense_tracker_goals', next);
      return next;
    });
  };

  const handleUpdateGoal = async (id: string, updates: any) => {
    const activeEmail = (profile?.email || getCachedEmail()).trim().toLowerCase();
    const updated = await api.updateGoal(id, updates);
    setGoals((prev) => {
      const next = prev.map((g) => (g.id === id ? updated : g));
      if (activeEmail) {
        setStoredData(`expense_tracker_goals_${activeEmail}`, next);
      }
      setStoredData('expense_tracker_goals', next);
      return next;
    });
  };

  const handleDeleteGoal = async (id: string) => {
    const activeEmail = (profile?.email || getCachedEmail()).trim().toLowerCase();
    await api.deleteGoal(id);
    setGoals((prev) => {
      const next = prev.filter((g) => g.id !== id);
      if (activeEmail) {
        setStoredData(`expense_tracker_goals_${activeEmail}`, next);
      }
      setStoredData('expense_tracker_goals', next);
      return next;
    });
  };

  const handleSaveReportSettings = async (settings: Partial<WeeklyReportSettings>) => {
    const updated = await api.saveReportSettings(settings);
    setReportSettings(updated);
  };

  const handleSaveProfile = async (data: { full_name: string; email: string }) => {
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const res = await api.saveProfile(data);
    const updated = res.profile || { full_name: data.full_name, email: cleanEmail, updated_at: new Date().toISOString() };
    setProfile(updated);
    setStoredData('expense_tracker_profile', updated);
    localStorage.setItem('expense_tracker_account_created', 'true');
    // Immediately reload and restore all historical data for this email!
    await fetchAllData(cleanEmail);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        status={status}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* System Storage & Service Banner */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-600 dark:text-slate-400">
              Storage Mode:{' '}
              <strong className="text-slate-900 dark:text-white">
                {status?.storage_type === 'supabase' ? 'Supabase Cloud Database (PostgreSQL)' : 'Local File Persistence (store.json)'}
              </strong>
            </span>
            {status?.storage_type !== 'supabase' && (
              <span className="hidden sm:inline-block text-[11px] text-slate-400">
                (Full local sync active. To enable cloud Supabase, add credentials in <code>.env</code>)
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Weekly Email:</span>
            {status?.formspree_configured || status?.resend_configured ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Formspree Active (Email Delivery Ready)</span>
              </span>
            ) : (
              <button
                onClick={() => setActiveTab('reports')}
                className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold text-[11px] flex items-center space-x-1 hover:underline"
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Setup Required &rarr;</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        {activeTab === 'dashboard' && (
          <Dashboard
            profile={profile}
            expenses={expenses}
            incomes={incomes}
            budgets={budgets}
            reportSettings={reportSettings}
            onAddExpense={handleAddExpense}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
            onNavigateTab={setActiveTab}
            onOpenChangeBudget={() => setIsChangeWeeklyBudgetOpen(true)}
          />
        )}

        {activeTab === 'analytics' && (
          <Analytics expenses={expenses} incomes={incomes} />
        )}

        {activeTab === 'transactions' && (
          <Transactions
            profile={profile}
            expenses={expenses}
            incomes={incomes}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
            onEditIncome={handleEditIncome}
            onDeleteIncome={handleDeleteIncome}
            onOpenAddIncome={() => setIsAddIncomeOpen(true)}
          />
        )}

        {activeTab === 'budgets' && (
          <Budgets
            budgets={budgets}
            expenses={expenses}
            onSaveBudgets={handleSaveBudgets}
          />
        )}

        {activeTab === 'income-goals' && (
          <IncomeAndGoals
            incomes={incomes}
            goals={goals}
            onAddIncome={handleAddIncome}
            onEditIncome={handleEditIncome}
            onDeleteIncome={handleDeleteIncome}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            expenses={expenses}
            incomes={incomes}
            onOpenQuickAdd={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'reports' && (
          <WeeklyReports
            profile={profile}
            budgets={budgets}
            reportSettings={reportSettings}
            status={status}
            onSaveReportSettings={handleSaveReportSettings}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onOpenChangeBudget={() => setIsChangeWeeklyBudgetOpen(true)}
            onRefreshStatus={fetchAllData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3">
          <div className="flex items-center space-x-2">
            <span>&copy; {new Date().getFullYear()} ExpenseTrack Pro &bull; Personal Financial Tracker</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Profile Settings
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Weekly Email Delivery
            </button>
            <button
              onClick={() => setActiveTab('budgets')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Budget Rules
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onSave={handleSaveProfile}
      />

      <ChangeWeeklyBudgetModal
        isOpen={isChangeWeeklyBudgetOpen}
        onClose={() => setIsChangeWeeklyBudgetOpen(false)}
        currentWeeklyBudget={budgets.weekly_budget}
        onSaveWeeklyBudget={handleSaveWeeklyBudget}
      />

      <EditTransactionModal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSaveExpense={handleSaveEditedExpense}
        onSaveIncome={handleSaveEditedIncome}
      />

      <AddIncomeModal
        isOpen={isAddIncomeOpen}
        onClose={() => setIsAddIncomeOpen(false)}
        onAddIncome={handleAddIncome}
      />
    </div>
  );
}

export default App;
