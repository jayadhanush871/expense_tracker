import React, { useState, useEffect } from 'react';
import {
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Sparkles
} from 'lucide-react';
import { BudgetSettings, Expense } from '../types';
import { formatINR } from '../services/api';

interface BudgetsProps {
  budgets: BudgetSettings;
  expenses: Expense[];
  onSaveBudgets: (settings: BudgetSettings) => Promise<void>;
}

const DEFAULT_CATEGORIES = [
  'Food & Drinks',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health & Wellness',
  'Education',
  'Other'
];

export const Budgets: React.FC<BudgetsProps> = ({
  budgets,
  expenses,
  onSaveBudgets
}) => {
  const [weeklyBudgetInput, setWeeklyBudgetInput] = useState<string>('');
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState<string>('');
  const [categoryBudgetsInput, setCategoryBudgetsInput] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setWeeklyBudgetInput(
      budgets.weekly_budget !== null && budgets.weekly_budget !== undefined
        ? String(budgets.weekly_budget)
        : ''
    );
    setMonthlyBudgetInput(
      budgets.monthly_budget !== null && budgets.monthly_budget !== undefined
        ? String(budgets.monthly_budget)
        : ''
    );
    const catMap: Record<string, string> = {};
    if (budgets.category_budgets) {
      Object.entries(budgets.category_budgets).forEach(([cat, val]) => {
        catMap[cat] = String(val);
      });
    }
    setCategoryBudgetsInput(catMap);
  }, [budgets]);

  // Current calculations
  const now = new Date();

  // Weekly expenses (past 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  const weeklyExpensesTotal = expenses
    .filter(e => e.date >= sevenDaysAgoStr)
    .reduce((s, e) => s + Number(e.amount), 0);

  // Monthly expenses (current calendar month)
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyExpensesTotal = expenses
    .filter(e => e.date.startsWith(currentMonthPrefix))
    .reduce((s, e) => s + Number(e.amount), 0);

  // Category expenses for this month
  const categoryExpensesThisMonth: Record<string, number> = {};
  expenses
    .filter(e => e.date.startsWith(currentMonthPrefix))
    .forEach(e => {
      categoryExpensesThisMonth[e.category] = (categoryExpensesThisMonth[e.category] || 0) + Number(e.amount);
    });

  // Threshold warning helper
  const getBudgetStatus = (budgetVal: number | null | undefined, actualSpent: number) => {
    // Unset vs zero budget
    if (budgetVal === null || budgetVal === undefined) {
      return {
        isSet: false,
        remaining: null,
        utilPct: 0,
        warning: null,
        statusText: 'Not Configured'
      };
    }

    const budget = Number(budgetVal);
    if (budget === 0) {
      return {
        isSet: true,
        remaining: -actualSpent,
        utilPct: actualSpent > 0 ? 100 : 0,
        warning: actualSpent > 0 ? { level: '100% Exceeded', color: 'bg-red-500 text-white' } : null,
        statusText: actualSpent > 0 ? 'Zero Budget Exceeded' : 'Zero Budget'
      };
    }

    const remaining = budget - actualSpent;
    const utilPct = (actualSpent / budget) * 100;

    let warning = null;
    if (utilPct >= 100) {
      warning = { level: '100% Reached (Exceeded)', color: 'bg-red-500 text-white', badgeBg: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400' };
    } else if (utilPct >= 90) {
      warning = { level: '90% Warning (Critical)', color: 'bg-orange-500 text-white', badgeBg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400' };
    } else if (utilPct >= 75) {
      warning = { level: '75% Warning (High)', color: 'bg-amber-500 text-white', badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' };
    } else if (utilPct >= 50) {
      warning = { level: '50% Warning (Moderate)', color: 'bg-yellow-500 text-white', badgeBg: 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-400' };
    }

    return {
      isSet: true,
      remaining,
      utilPct,
      warning,
      statusText: `${utilPct.toFixed(1)}% Utilized`
    };
  };

  const weeklyStatus = getBudgetStatus(budgets.weekly_budget, weeklyExpensesTotal);
  const monthlyStatus = getBudgetStatus(budgets.monthly_budget, monthlyExpensesTotal);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const parsedWeekly = weeklyBudgetInput.trim() === '' ? null : parseFloat(weeklyBudgetInput);
      const parsedMonthly = monthlyBudgetInput.trim() === '' ? null : parseFloat(monthlyBudgetInput);

      const parsedCatBudgets: Record<string, number> = {};
      Object.entries(categoryBudgetsInput).forEach(([cat, val]) => {
        if (val.trim() !== '') {
          const num = parseFloat(val);
          if (!isNaN(num) && num >= 0) {
            parsedCatBudgets[cat] = num;
          }
        }
      });

      await onSaveBudgets({
        weekly_budget: parsedWeekly,
        monthly_budget: parsedMonthly,
        category_budgets: parsedCatBudgets
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save budgets');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
          <PiggyBank className="w-5 h-5 text-indigo-600" />
          <span>Budget Configuration & Thresholds</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Weekly budget powers your automated weekly email report; Monthly budget powers your dashboard view.
        </p>
      </div>

      {/* Real-time Budget Utilization Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Budget Progress Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Weekly Budget (Used for Email Reports)
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {weeklyStatus.isSet ? formatINR(budgets.weekly_budget) : 'Not Configured'}
              </h3>
            </div>
            {weeklyStatus.warning && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${weeklyStatus.warning.color}`}>
                {weeklyStatus.warning.level}
              </span>
            )}
          </div>

          {weeklyStatus.isSet ? (
            <div className="space-y-3 mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  Past 7 days spent: <strong className="text-slate-900 dark:text-white">{formatINR(weeklyExpensesTotal)}</strong>
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  Remaining:{' '}
                  <strong className={weeklyStatus.remaining! < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}>
                    {formatINR(weeklyStatus.remaining)}
                  </strong>
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    weeklyStatus.utilPct >= 100
                      ? 'bg-red-500'
                      : weeklyStatus.utilPct >= 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, weeklyStatus.utilPct)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>0%</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {weeklyStatus.utilPct.toFixed(1)}% utilized
                </span>
                <span>100%</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              Set a weekly budget below to receive budget utilization metrics and remaining balances in your weekly emails.
            </p>
          )}
        </div>

        {/* Monthly Budget Progress Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Monthly Budget (Current Month)
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {monthlyStatus.isSet ? formatINR(budgets.monthly_budget) : 'Not Configured'}
              </h3>
            </div>
            {monthlyStatus.warning && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${monthlyStatus.warning.color}`}>
                {monthlyStatus.warning.level}
              </span>
            )}
          </div>

          {monthlyStatus.isSet ? (
            <div className="space-y-3 mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  This month spent: <strong className="text-slate-900 dark:text-white">{formatINR(monthlyExpensesTotal)}</strong>
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  Remaining:{' '}
                  <strong className={monthlyStatus.remaining! < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}>
                    {formatINR(monthlyStatus.remaining)}
                  </strong>
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    monthlyStatus.utilPct >= 100
                      ? 'bg-red-500'
                      : monthlyStatus.utilPct >= 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, monthlyStatus.utilPct)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>0%</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {monthlyStatus.utilPct.toFixed(1)}% utilized
                </span>
                <span>100%</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              Configure a monthly budget below to display monthly progress bars and threshold warnings on your dashboard.
            </p>
          )}
        </div>
      </div>

      {/* Threshold Warning Reference Card */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
        <div className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center space-x-1.5">
          <AlertCircle className="w-4 h-4 text-indigo-500" />
          <span>Automated Threshold Warning Rules:</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50">
            <strong>50% Reached:</strong> Gentle advisory threshold
          </div>
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            <strong>75% Warning:</strong> Attention alert
          </div>
          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50">
            <strong>90% Critical:</strong> High spending limit alert
          </div>
          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <strong>100% Exceeded:</strong> Over-budget alarm
          </div>
        </div>
      </div>

      {/* Budget Configuration Form */}
      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Configure Budgets</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Leave blank to keep unset. Enter 0 for strict zero-budget.
            </p>
          </div>
          {saveSuccess && (
            <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-4 h-4" />
              <span>Budgets Saved Successfully!</span>
            </span>
          )}
        </div>

        {/* Global Budgets Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              Weekly Budget (₹)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="any"
                min="0"
                value={weeklyBudgetInput}
                onChange={(e) => setWeeklyBudgetInput(e.target.value)}
                placeholder="e.g. 2000 (leave blank for unset)"
                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Calculated and reported in your weekly email report.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              Monthly Budget (₹)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="any"
                min="0"
                value={monthlyBudgetInput}
                onChange={(e) => setMonthlyBudgetInput(e.target.value)}
                placeholder="e.g. 15000 (leave blank for unset)"
                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Used on your main dashboard overview.</p>
          </div>
        </div>

        {/* Category-Specific Budgets Section */}
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Category-Specific Monthly Budgets (Optional)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Set individual limits for specific categories like Food, Transport, or Shopping.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEFAULT_CATEGORIES.map((cat) => {
              const spent = categoryExpensesThisMonth[cat] || 0;
              const configuredLimit = categoryBudgetsInput[cat] ? parseFloat(categoryBudgetsInput[cat]) : null;
              const hasLimit = configuredLimit !== null && !isNaN(configuredLimit) && configuredLimit > 0;
              const limitPct = hasLimit ? (spent / configuredLimit!) * 100 : 0;

              return (
                <div key={cat} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate mb-1">
                    {cat}
                  </span>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center font-bold text-xs text-slate-400">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={categoryBudgetsInput[cat] || ''}
                      onChange={(e) => {
                        setCategoryBudgetsInput({
                          ...categoryBudgetsInput,
                          [cat]: e.target.value
                        });
                      }}
                      placeholder="No limit"
                      className="w-full pl-6 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
                    <span>Spent this mo: {formatINR(spent)}</span>
                    {hasLimit && (
                      <span className={limitPct >= 100 ? 'text-red-500 font-bold' : ''}>
                        {limitPct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Budgets...' : 'Save Budget Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
