import React, { useState } from 'react';
import { PlusCircle, Sparkles, Check, Tag } from 'lucide-react';
import { clientDetectCategory } from '../services/api';

interface QuickAddExpenseProps {
  onAddExpense: (data: {
    amount: number;
    description: string;
    category?: string;
    date: string;
    time: string;
  }) => Promise<void>;
}

const CATEGORIES = [
  'PhonePe',
  'Cash',
  'Food & Drinks',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health & Wellness',
  'Education',
  'Other'
];

export const QuickAddExpense: React.FC<QuickAddExpenseProps> = ({ onAddExpense }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [manualCategory, setManualCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Auto-detect category from description in real-time
  const detectedCategory = clientDetectCategory(description);
  const activeCategory = manualCategory || detectedCategory;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      alert('Please enter what you spent it on.');
      return;
    }

    try {
      setIsSubmitting(true);
      const now = new Date();
      // Automatic capture of date and time from the system
      const autoDate = now.toISOString().split('T')[0];
      const autoTime = now.toTimeString().split(' ')[0];

      await onAddExpense({
        amount: numAmount,
        description: description.trim(),
        category: activeCategory,
        date: autoDate,
        time: autoTime,
      });

      // Reset
      setAmount('');
      setDescription('');
      setManualCategory(null);
      setShowCategoryPicker(false);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <PlusCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Add Expense</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Date & time captured automatically</p>
          </div>
        </div>

        {justAdded && (
          <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Saved!</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Field 1: Amount */}
          <div className="sm:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-semibold text-sm">
              ₹
            </div>
            <input
              type="number"
              step="any"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (e.g. 40)"
              className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            />
          </div>

          {/* Field 2: What I spent it on */}
          <div className="sm:col-span-8 relative">
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (manualCategory) setManualCategory(null); // Reset manual on new typing
              }}
              placeholder="What did you spend on? (e.g. Tea and snacks)"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            />
          </div>
        </div>

        {/* Quick Payment Mode / Category: PhonePe vs Cash */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Payment Category:</span>
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setManualCategory('PhonePe');
                setShowCategoryPicker(false);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeCategory === 'PhonePe'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-purple-600'
              }`}
            >
              <span>📱 PhonePe</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setManualCategory('Cash');
                setShowCategoryPicker(false);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeCategory === 'Cash'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
              }`}
            >
              <span>💵 Cash</span>
            </button>
          </div>

          <div className="flex items-center space-x-1.5 ml-auto">
            {activeCategory !== 'PhonePe' && activeCategory !== 'Cash' && (
              <button
                type="button"
                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>{activeCategory}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {showCategoryPicker ? 'Hide others' : 'Other categories'}
            </button>
          </div>
        </div>

        {/* Submit Button Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-500">
            Selected: <strong className={activeCategory === 'PhonePe' ? 'text-purple-600 font-bold' : activeCategory === 'Cash' ? 'text-emerald-600 font-bold' : 'text-indigo-600'}>{activeCategory}</strong>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !amount || !description}
            className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all flex items-center justify-center space-x-1.5"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Save Expense</span>
              </>
            )}
          </button>
        </div>

        {/* Optional Category Override Dropdown */}
        {showCategoryPicker && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 mt-2">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center space-x-1">
              <Tag className="w-3 h-3" />
              <span>Choose a category override (optional):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setManualCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
