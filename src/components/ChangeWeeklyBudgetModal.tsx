import React, { useState, useEffect } from 'react';
import { X, PiggyBank, Check, Sparkles } from 'lucide-react';
import { formatINR } from '../services/api';

interface ChangeWeeklyBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeeklyBudget: number | null | undefined;
  onSaveWeeklyBudget: (newBudget: number | null) => Promise<void>;
}

const PRESET_AMOUNTS = [1000, 1500, 2500, 3000, 5000, 7500, 10000];

export const ChangeWeeklyBudgetModal: React.FC<ChangeWeeklyBudgetModalProps> = ({
  isOpen,
  onClose,
  currentWeeklyBudget,
  onSaveWeeklyBudget
}) => {
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBudgetInput(
        currentWeeklyBudget !== null && currentWeeklyBudget !== undefined
          ? String(currentWeeklyBudget)
          : ''
      );
      setError(null);
    }
  }, [isOpen, currentWeeklyBudget]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      let parsedBudget: number | null = null;
      if (budgetInput.trim() !== '') {
        const num = parseFloat(budgetInput.trim());
        if (isNaN(num) || num < 0) {
          setError('Please enter a valid positive number for your weekly budget.');
          setIsSubmitting(false);
          return;
        }
        parsedBudget = num;
      }

      await onSaveWeeklyBudget(parsedBudget);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update weekly budget.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Change Weekly Budget
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Used in dashboard & automated weekly email reports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              Weekly Budget Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-bold text-slate-400 text-base">₹</span>
              <input
                type="number"
                step="any"
                min="0"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="Enter amount (e.g. 1500, 3000, 5000)"
                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Current: {currentWeeklyBudget !== null && currentWeeklyBudget !== undefined ? formatINR(currentWeeklyBudget) : 'Not configured'}
            </p>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Quick Presets:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBudgetInput(String(amt))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    budgetInput === String(amt)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center space-x-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Weekly Budget'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
