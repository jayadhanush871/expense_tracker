import React, { useState } from 'react';
import {
  Wallet,
  PiggyBank,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  Award,
  Sparkles
} from 'lucide-react';
import { Income, SavingsGoal } from '../types';
import { formatINR } from '../services/api';

interface IncomeAndGoalsProps {
  incomes: Income[];
  goals: SavingsGoal[];
  onAddIncome: (data: { amount: number; source: string; category?: string; date?: string }) => Promise<void>;
  onEditIncome: (income: Income) => void;
  onDeleteIncome: (id: string) => Promise<void>;
  onAddGoal: (data: { title: string; target_amount: number; saved_amount?: number; target_date?: string | null }) => Promise<void>;
  onUpdateGoal: (id: string, data: Partial<SavingsGoal>) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
}

export const IncomeAndGoals: React.FC<IncomeAndGoalsProps> = ({
  incomes,
  goals,
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal
}) => {
  // Income Form State
  const [incAmount, setIncAmount] = useState('');
  const [incSource, setIncSource] = useState('');
  const [incCategory, setIncCategory] = useState('Salary');
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingIncome, setIsSubmittingIncome] = useState(false);

  // Goal Form State
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalSaved, setGoalSaved] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);

  // Deposit State
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalSavedGoals = goals.reduce((s, g) => s + Number(g.saved_amount), 0);
  const totalTargetGoals = goals.reduce((s, g) => s + Number(g.target_amount), 0);

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(incAmount);
    if (isNaN(num) || num <= 0) return alert('Enter valid income amount');
    if (!incSource.trim()) return alert('Enter income source');

    try {
      setIsSubmittingIncome(true);
      await onAddIncome({
        amount: num,
        source: incSource.trim(),
        category: incCategory,
        date: incDate
      });
      setIncAmount('');
      setIncSource('');
    } catch (err: any) {
      alert(err.message || 'Failed to add income');
    } finally {
      setIsSubmittingIncome(false);
    }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numTarget = parseFloat(goalTarget);
    if (!goalTitle.trim()) return alert('Enter goal title');
    if (isNaN(numTarget) || numTarget <= 0) return alert('Enter valid target amount');

    try {
      setIsSubmittingGoal(true);
      await onAddGoal({
        title: goalTitle.trim(),
        target_amount: numTarget,
        saved_amount: parseFloat(goalSaved) || 0,
        target_date: goalDate || null
      });
      setIsAddingGoal(false);
      setGoalTitle('');
      setGoalTarget('');
      setGoalSaved('');
      setGoalDate('');
    } catch (err: any) {
      alert(err.message || 'Failed to add savings goal');
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  const handleDepositSubmit = async (goal: SavingsGoal) => {
    const numDep = parseFloat(depositAmount);
    if (isNaN(numDep) || numDep <= 0) return alert('Enter valid deposit amount');

    try {
      const newSaved = Number(goal.saved_amount) + numDep;
      await onUpdateGoal(goal.id, { saved_amount: newSaved });
      setDepositGoalId(null);
      setDepositAmount('');
    } catch (err: any) {
      alert(err.message || 'Failed to deposit savings');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <span>Income Streams & Savings Goals</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log your earnings and track progress toward your financial targets
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddingGoal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center space-x-1.5"
          >
            <PiggyBank className="w-4 h-4" />
            <span>Create Savings Goal</span>
          </button>
        </div>
      </div>

      {/* Grid: Add Income Form & Income List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Income Entry Form (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Record New Income</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Add salary, freelancing, or investments</p>
            </div>
          </div>

          <form onSubmit={handleIncomeSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Income Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={incAmount}
                  onChange={(e) => setIncAmount(e.target.value)}
                  placeholder="e.g. 35000"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Source Description
              </label>
              <input
                type="text"
                value={incSource}
                onChange={(e) => setIncSource(e.target.value)}
                placeholder="e.g. Monthly Salary, Freelance project"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={incCategory}
                  onChange={(e) => setIncCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="PhonePe">📱 PhonePe</option>
                  <option value="Cash">💵 Cash</option>
                  <option value="Salary">Salary</option>
                  <option value="Freelancing">Freelancing</option>
                  <option value="Investments">Investments</option>
                  <option value="Gift">Gift</option>
                  <option value="Rental">Rental</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={incDate}
                  onChange={(e) => setIncDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingIncome}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center space-x-1.5 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmittingIncome ? 'Saving...' : 'Add Income'}</span>
            </button>
          </form>
        </div>

        {/* Income History (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Income Entries</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Total earned: {formatINR(totalIncome)}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 text-xs font-bold">
              {incomes.length} records
            </span>
          </div>

          {incomes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No income entries recorded yet. Add one using the form.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto pr-1">
              {incomes.map((inc) => (
                <div key={inc.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors">
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {inc.source}
                    </div>
                    <div className="text-[10px] text-slate-500 space-x-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{inc.category}</span>
                      <span>&bull;</span>
                      <span>{inc.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      +{formatINR(inc.amount)}
                    </span>
                    <button
                      onClick={() => onEditIncome(inc)}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteIncome(inc.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Savings Goals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <PiggyBank className="w-4 h-4 text-indigo-600" />
              <span>Savings Goals Portfolio</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Saved {formatINR(totalSavedGoals)} toward {formatINR(totalTargetGoals)} total targets
            </p>
          </div>
        </div>

        {/* Create Goal Inline Modal */}
        {isAddingGoal && (
          <form onSubmit={handleGoalSubmit} className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                Create New Savings Goal
              </h4>
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="Goal Title (e.g. Emergency Fund)"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Target Amount (₹)"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Already Saved (optional)"
                  value={goalSaved}
                  onChange={(e) => setGoalSaved(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingGoal}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow-sm hover:bg-indigo-700"
              >
                {isSubmittingGoal ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </form>
        )}

        {/* Goals Cards Grid */}
        {goals.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
            No savings goals set yet. Click "Create Savings Goal" above to start tracking!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((g) => {
              const saved = Number(g.saved_amount);
              const target = Number(g.target_amount);
              const pct = target > 0 ? (saved / target) * 100 : 0;
              const isCompleted = saved >= target;

              return (
                <div key={g.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {g.title}
                      </h4>
                      {g.target_date && (
                        <span className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>Target: {g.target_date}</span>
                        </span>
                      )}
                    </div>
                    {isCompleted ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 text-[10px] font-bold flex items-center space-x-1">
                        <Award className="w-3 h-3" />
                        <span>Completed!</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {pct.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      Saved: <strong>{formatINR(saved)}</strong>
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Target: <strong>{formatINR(target)}</strong>
                    </span>
                  </div>

                  {/* Quick deposit inline trigger */}
                  {depositGoalId === g.id ? (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2">
                      <input
                        type="number"
                        placeholder="Add amount"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800"
                      />
                      <button
                        onClick={() => handleDepositSubmit(g)}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setDepositGoalId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <button
                        onClick={() => setDepositGoalId(g.id)}
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        + Add Money
                      </button>
                      <button
                        onClick={() => onDeleteGoal(g.id)}
                        className="text-slate-400 hover:text-red-500"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
