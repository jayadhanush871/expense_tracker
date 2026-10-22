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

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<BudgetSettings>({
    weekly_budget: null,
    monthly_budget: null,
    category_budgets: {}
  });
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [reportSettings, setReportSettings] = useState<WeeklyReportSettings>({
    is_active: true,
    delivery_day: 'Sunday',
    delivery_time: '09:00',
    timezone: 'Asia/Kolkata',
    last_sent_period: null
  });
  const [status, setStatus] = useState<SystemStatus | null>(null);

  // Modals & Controls
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
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

  // Initial Data Fetching
  const fetchAllData = async () => {
    try {
      setIsLoading(true);
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
        api.getProfile().catch(() => null),
        api.getExpenses().catch(() => []),
        api.getIncomes().catch(() => []),
        api.getBudgets().catch(() => ({ weekly_budget: null, monthly_budget: null, category_budgets: {} })),
        api.getGoals().catch(() => []),
        api.getReportSettings().catch(() => ({
          is_active: true,
          delivery_day: 'Sunday',
          delivery_time: '09:00',
          timezone: 'Asia/Kolkata',
          last_sent_period: null
        }))
      ]);

      if (sysStatus) setStatus(sysStatus);
      if (prof) setProfile(prof);
      setExpenses(expList);
      setIncomes(incList);
      setBudgets(budg);
      setGoals(gList);
      setReportSettings(repSet);

      // If no profile name exists, prompt user to set profile
      if (!prof || !prof.full_name) {
        setIsProfileModalOpen(true);
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
    const created = await api.addExpense(data);
    setExpenses((prev) => [created, ...prev]);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingItem({ ...expense, type: 'expense' });
  };

  const handleSaveEditedExpense = async (id: string, updates: Partial<Expense>) => {
    const updated = await api.updateExpense(id, updates);
    setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    setEditingItem(null);
  };

  const handleDeleteExpense = async (id: string) => {
    await api.deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddIncome = async (data: {
    amount: number;
    source: string;
    category?: string;
    date?: string;
  }) => {
    const created = await api.addIncome(data);
    setIncomes((prev) => [created, ...prev]);
  };

  const handleEditIncome = (income: Income) => {
    setEditingItem({ ...income, type: 'income' });
  };

  const handleSaveEditedIncome = async (id: string, updates: Partial<Income>) => {
    const updated = await api.updateIncome(id, updates);
    setIncomes((prev) => prev.map((i) => (i.id === id ? updated : i)));
    setEditingItem(null);
  };

  const handleDeleteIncome = async (id: string) => {
    await api.deleteIncome(id);
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSaveBudgets = async (newBudgets: BudgetSettings) => {
    const saved = await api.saveBudgets(newBudgets);
    setBudgets(saved);
  };

  const handleAddGoal = async (data: any) => {
    const created = await api.addGoal(data);
    setGoals((prev) => [created, ...prev]);
  };

  const handleUpdateGoal = async (id: string, updates: any) => {
    const updated = await api.updateGoal(id, updates);
    setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
  };

  const handleDeleteGoal = async (id: string) => {
    await api.deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleSaveReportSettings = async (settings: Partial<WeeklyReportSettings>) => {
    const updated = await api.saveReportSettings(settings);
    setReportSettings(updated);
  };

  const handleSaveProfile = async (data: { full_name: string; email: string }) => {
    const res = await api.saveProfile(data);
    if (res.profile) {
      setProfile(res.profile);
    }
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
            {status?.resend_configured ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Resend Active</span>
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
            reportSettings={reportSettings}
            status={status}
            onSaveReportSettings={handleSaveReportSettings}
            onOpenProfile={() => setIsProfileModalOpen(true)}
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
