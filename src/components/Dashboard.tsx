import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Mail,
  Trash2,
  Edit2
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Profile, Expense, Income, BudgetSettings, WeeklyReportSettings } from '../types';
import { QuickAddExpense } from './QuickAddExpense';
import { formatINR } from '../services/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface DashboardProps {
  profile: Profile | null;
  expenses: Expense[];
  incomes: Income[];
  budgets: BudgetSettings;
  reportSettings: WeeklyReportSettings;
  onAddExpense: (data: any) => Promise<void>;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => Promise<void>;
  onNavigateTab: (tab: string) => void;
  onOpenChangeBudget?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  expenses,
  incomes,
  budgets,
  reportSettings,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onNavigateTab,
  onOpenChangeBudget
}) => {
  const userName = profile?.full_name || 'Friend';

  // Greeting based on time of day
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Total Income and Expense
  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const currentBalance = totalIncome - totalExpenses;

  // PhonePe vs Cash Category Separation
  const isPhonePeCategory = (cat: string) => {
    const c = (cat || '').toLowerCase();
    return c.includes('phonepe') || c.includes('phone pay') || c.includes('phonepay') || c.includes('upi') || c.includes('gpay') || c.includes('online');
  };
  const isCashCategory = (cat: string) => {
    const c = (cat || '').toLowerCase();
    return c.includes('cash') || c.includes('atm') || c.includes('hand');
  };

  const phonePeExpenses = expenses
    .filter(e => isPhonePeCategory(e.category))
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const phonePeIncomes = incomes
    .filter(i => isPhonePeCategory(i.category))
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const phonePeBalance = phonePeIncomes - phonePeExpenses;
  const phonePeCount = expenses.filter(e => isPhonePeCategory(e.category)).length + incomes.filter(i => isPhonePeCategory(i.category)).length;

  const cashExpenses = expenses
    .filter(e => isCashCategory(e.category))
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const cashIncomes = incomes
    .filter(i => isCashCategory(i.category))
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const cashBalance = cashIncomes - cashExpenses;
  const cashCount = expenses.filter(e => isCashCategory(e.category)).length + incomes.filter(i => isCashCategory(i.category)).length;

  // Current Month calculations
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthExpenses = expenses
    .filter((e) => e.date.startsWith(currentMonthStr))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const monthlyBudget = budgets.monthly_budget;
  const isMonthlyBudgetSet = monthlyBudget !== null && monthlyBudget !== undefined;
  const monthlyRemaining = isMonthlyBudgetSet ? monthlyBudget - thisMonthExpenses : null;
  const monthlyUtilizedPct = isMonthlyBudgetSet && monthlyBudget > 0 ? (thisMonthExpenses / monthlyBudget) * 100 : 0;

  // Current Week calculations (past 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  const thisWeekExpenses = expenses
    .filter((e) => e.date >= sevenDaysAgoStr)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const weeklyBudget = budgets.weekly_budget;
  const isWeeklyBudgetSet = weeklyBudget !== null && weeklyBudget !== undefined;
  const weeklyRemaining = isWeeklyBudgetSet ? weeklyBudget - thisWeekExpenses : null;
  const weeklyUtilizedPct = isWeeklyBudgetSet && weeklyBudget > 0 ? (thisWeekExpenses / weeklyBudget) * 100 : 0;

  // Budget threshold warning helper
  const getThresholdWarning = (utilPct: number) => {
    if (utilPct >= 100) return { label: '100% Exceeded', color: 'bg-red-500 text-white', border: 'border-red-500' };
    if (utilPct >= 90) return { label: '90% Warning', color: 'bg-orange-500 text-white', border: 'border-orange-500' };
    if (utilPct >= 75) return { label: '75% Warning', color: 'bg-amber-500 text-white', border: 'border-amber-500' };
    if (utilPct >= 50) return { label: '50% Reached', color: 'bg-yellow-500 text-white', border: 'border-yellow-500' };
    return null;
  };

  const monthlyWarning = isMonthlyBudgetSet ? getThresholdWarning(monthlyUtilizedPct) : null;
  const weeklyWarning = isWeeklyBudgetSet ? getThresholdWarning(weeklyUtilizedPct) : null;

  // Category breakdown for Doughnut chart
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
  });

  const doughnutData = {
    labels: Object.keys(categoryTotals).length > 0 ? Object.keys(categoryTotals) : ['No Expenses'],
    datasets: [
      {
        data: Object.values(categoryTotals).length > 0 ? Object.values(categoryTotals) : [1],
        backgroundColor: [
          '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#94a3b8'
        ],
        borderWidth: 0,
      },
    ],
  };

  // Last 7 days Bar chart
  const last7DaysLabels: string[] = [];
  const last7DaysValues: number[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    last7DaysLabels.push(dayNames[d.getDay()]);
    const dayTotal = expenses
      .filter((e) => e.date === dStr)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    last7DaysValues.push(dayTotal);
  }

  const barData = {
    labels: last7DaysLabels,
    datasets: [
      {
        label: 'Daily Spending (₹)',
        data: last7DaysValues,
        backgroundColor: '#6366f1',
        borderRadius: 8,
      },
    ],
  };

  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Smart Personal Expense Manager</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {timeGreeting}, {userName}! 👋
          </h1>
          <p className="text-sm text-indigo-200 mt-1 max-w-xl">
            Track daily expenses with instant auto-categorization and receive weekly email reports sent directly to{' '}
            <span className="font-semibold text-white underline decoration-indigo-400">{profile?.email || 'your email'}</span>.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2">
          <button
            onClick={() => onNavigateTab('reports')}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-semibold text-xs sm:text-sm hover:bg-indigo-50 shadow-md transition-all"
          >
            <Mail className="w-4 h-4 text-indigo-600" />
            <span>Weekly Report Hub</span>
          </button>
        </div>

        {/* Background glow decoration */}
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Balance Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Cash Balance</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${currentBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-500'}`}>
            {formatINR(currentBalance)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-1">
            <span>Income minus all expenses</span>
          </p>
        </div>

        {/* Total Income Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Income</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatINR(totalIncome)}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">{incomes.length} records</span>
            <button
              onClick={() => onNavigateTab('income-goals')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center"
            >
              Manage &rarr;
            </button>
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Expenses</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatINR(totalExpenses)}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">{expenses.length} transactions</span>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center"
            >
              View All &rarr;
            </button>
          </div>
        </div>

        {/* Weekly Budget Progress Card */}
        <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm transition-colors ${
          weeklyWarning ? weeklyWarning.border : 'border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Weekly Budget</span>
            <div className="flex items-center space-x-1.5">
              {weeklyWarning && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${weeklyWarning.color}`}>
                  {weeklyWarning.label}
                </span>
              )}
              {onOpenChangeBudget && (
                <button
                  type="button"
                  onClick={onOpenChangeBudget}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition-colors"
                >
                  Change
                </button>
              )}
              {!weeklyWarning && (
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <PiggyBank className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {isWeeklyBudgetSet ? formatINR(weeklyBudget) : 'Not Configured'}
          </div>
          {isWeeklyBudgetSet ? (
            <div className="mt-2 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Spent: {formatINR(thisWeekExpenses)}</span>
                <span className={weeklyRemaining! < 0 ? 'text-red-500 font-bold' : ''}>
                  Left: {formatINR(Math.max(0, weeklyRemaining!))}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    weeklyUtilizedPct >= 100
                      ? 'bg-red-500'
                      : weeklyUtilizedPct >= 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, weeklyUtilizedPct)}%` }}
                />
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{weeklyUtilizedPct.toFixed(1)}% utilized</span>
                {onOpenChangeBudget && (
                  <button
                    type="button"
                    onClick={onOpenChangeBudget}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center space-x-1"
                  >
                    <span>Edit budget &rarr;</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenChangeBudget || (() => onNavigateTab('budgets'))}
              className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Set weekly budget &rarr;
            </button>
          )}
        </div>
      </div>

      {/* PhonePe vs Cash Separate Breakdown Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>PhonePe & Cash Separation</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Separate Accounts
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dedicated balances for PhonePe (UPI / Online) and Cash in Hand transactions
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center space-x-1"
          >
            <span>View All Transactions &rarr;</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. PhonePe Account Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-purple-50/50 to-indigo-50/30 dark:from-purple-950/40 dark:via-purple-950/20 dark:to-slate-900 border border-purple-200 dark:border-purple-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  📱
                </div>
                <div>
                  <h4 className="text-sm font-black text-purple-950 dark:text-purple-200">PhonePe Account</h4>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">{phonePeCount} transactions</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">PhonePe Balance</span>
                <span className={`text-xl font-black ${phonePeBalance >= 0 ? 'text-purple-700 dark:text-purple-300' : 'text-rose-600'}`}>
                  {formatINR(phonePeBalance)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-200/50 dark:border-purple-800/40 text-xs">
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-purple-100 dark:border-purple-900/40">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">PhonePe Income</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">+{formatINR(phonePeIncomes)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-purple-100 dark:border-purple-900/40">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">PhonePe Spent</span>
                <span className="font-black text-rose-600 dark:text-rose-400 text-sm">-{formatINR(phonePeExpenses)}</span>
              </div>
            </div>
          </div>

          {/* 2. Cash Account Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-teal-50/30 dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  💵
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-200">Cash in Hand</h4>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{cashCount} transactions</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cash Balance</span>
                <span className={`text-xl font-black ${cashBalance >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'}`}>
                  {formatINR(cashBalance)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40 text-xs">
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Cash Income</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">+{formatINR(cashIncomes)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Cash Spent</span>
                <span className="font-black text-rose-600 dark:text-rose-400 text-sm">-{formatINR(cashExpenses)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Form Section */}
      <QuickAddExpense onAddExpense={onAddExpense} />

      {/* Monthly Budget Warning Banner if 50% / 75% / 90% / 100% */}
      {monthlyWarning && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-sm ${
          monthlyUtilizedPct >= 100
            ? 'bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300'
            : 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
        }`}>
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold">Monthly Budget Alert: </span>
              <span>
                You have spent {formatINR(thisMonthExpenses)} out of your {formatINR(monthlyBudget)} monthly budget ({monthlyUtilizedPct.toFixed(1)}% utilized).
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('budgets')}
            className="px-3 py-1 bg-white dark:bg-slate-800 font-semibold text-xs rounded-lg shadow-sm border hover:bg-slate-50 transition-colors"
          >
            Adjust Budget
          </button>
        </div>
      )}

      {/* Grid: Visual Charts & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Latest expenses captured automatically</p>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No expenses recorded yet. Use the quick-add form above to add your first expense!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="py-3 flex items-center justify-between group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs uppercase">
                      {expense.category.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {expense.description}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {expense.category}
                        </span>
                        <span>&bull;</span>
                        <span>{expense.date}</span>
                        {expense.time && <span>{expense.time.slice(0, 5)}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      -{formatINR(expense.amount)}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                      <button
                        onClick={() => onEditExpense(expense)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteExpense(expense.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mini Charts & Weekly Email Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Spending by Category Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Expenses by Category</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Overall spending distribution</p>
            <div className="h-48 flex items-center justify-center">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                  }
                }}
              />
            </div>
          </div>

          {/* Weekly Email Report Reminder Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-indigo-100 dark:border-slate-700">
            <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-400 mb-2">
              <Mail className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Automated Weekly Report</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Scheduled to dispatch every <strong className="text-indigo-600 dark:text-indigo-400">{reportSettings.delivery_day}</strong> at{' '}
              <strong className="text-indigo-600 dark:text-indigo-400">{reportSettings.delivery_time}</strong> ({reportSettings.timezone}) to{' '}
              <strong className="text-slate-900 dark:text-white">{profile?.email || 'your email'}</strong>.
            </p>
            <button
              onClick={() => onNavigateTab('reports')}
              className="mt-3 w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center space-x-1"
            >
              <span>View Weekly Summary & Email Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
