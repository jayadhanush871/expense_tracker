import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Expense, Income } from '../types';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: (Expense | Income) & { type?: 'expense' | 'income' } | null;
  onSaveExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  onSaveIncome: (id: string, data: Partial<Income>) => Promise<void>;
}

const CATEGORIES = [
  'Food & Drinks',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health & Wellness',
  'Education',
  'Salary',
  'Freelancing',
  'Investments',
  'Other'
];

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  item,
  onSaveExpense,
  onSaveIncome
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isExpense = item && (!('source' in item) || item.type === 'expense');

  useEffect(() => {
    if (item) {
      setAmount(String(item.amount));
      setDescription(('description' in item ? item.description : item.source) || '');
      setCategory(item.category || 'Other');
      setDate(item.date || '');
      setTime(('time' in item ? item.time : '') || '');
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return alert('Enter valid amount');

    try {
      setIsSubmitting(true);
      if (isExpense) {
        await onSaveExpense(item.id, {
          amount: num,
          description: description.trim(),
          category,
          date,
          time
        });
      } else {
        await onSaveIncome(item.id, {
          amount: num,
          source: description.trim(),
          category,
          date
        });
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to update transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Edit {isExpense ? 'Expense' : 'Income'} Transaction
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-bold text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isExpense ? 'Description' : 'Source'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {isExpense && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Time (HH:MM:SS)
              </label>
              <input
                type="time"
                step="1"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          )}

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center space-x-1"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
