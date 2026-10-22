import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { Expense, Income } from '../types';
import { formatINR } from '../services/api';

interface CalendarViewProps {
  expenses: Expense[];
  incomes: Income[];
  onOpenQuickAdd: (date: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  expenses,
  incomes,
  onOpenQuickAdd
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group transactions by date
  const expensesByDate: Record<string, Expense[]> = {};
  expenses.forEach(e => {
    expensesByDate[e.date] = expensesByDate[e.date] || [];
    expensesByDate[e.date].push(e);
  });

  const incomesByDate: Record<string, Income[]> = {};
  incomes.forEach(i => {
    incomesByDate[i.date] = incomesByDate[i.date] || [];
    incomesByDate[i.date].push(i);
  });

  // Selected date transactions
  const selectedExpenses = expensesByDate[selectedDateStr] || [];
  const selectedIncomes = incomesByDate[selectedDateStr] || [];
  const selectedTotalSpent = selectedExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const selectedTotalEarned = selectedIncomes.reduce((s, i) => s + Number(i.amount), 0);

  // Calendar cells
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            <span>Interactive Spending Calendar</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click on any day to inspect daily purchases and logged earnings
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 min-w-[140px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Grid (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Day Names Row */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {blanks.map((b) => (
              <div key={`blank-${b}`} className="h-16 sm:h-20 rounded-xl bg-slate-50/50 dark:bg-slate-800/20" />
            ))}

            {days.map((d) => {
              const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isSelected = dStr === selectedDateStr;
              const isToday = dStr === new Date().toISOString().split('T')[0];
              const dayExpenses = expensesByDate[dStr] || [];
              const dayIncomes = incomesByDate[dStr] || [];
              const dayTotalSpent = dayExpenses.reduce((s, e) => s + Number(e.amount), 0);

              return (
                <div
                  key={dStr}
                  onClick={() => setSelectedDateStr(dStr)}
                  className={`h-16 sm:h-20 p-1 sm:p-2 rounded-xl cursor-pointer transition-all border flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                      : isToday
                      ? 'border-indigo-300 dark:border-indigo-700 bg-slate-50 dark:bg-slate-800/60'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      isToday
                        ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {d}
                    </span>
                    {dayIncomes.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Income recorded" />
                    )}
                  </div>

                  {dayTotalSpent > 0 && (
                    <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 truncate">
                      -{formatINR(dayTotalSpent)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Transaction Breakdown (4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-xs font-semibold uppercase text-slate-400">Activity for:</span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {new Date(selectedDateStr).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </h3>
            <div className="flex items-center space-x-3 text-xs mt-2">
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                Spent: {formatINR(selectedTotalSpent)}
              </span>
              {selectedTotalEarned > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  Earned: +{formatINR(selectedTotalEarned)}
                </span>
              )}
            </div>
          </div>

          {selectedExpenses.length === 0 && selectedIncomes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No transactions on this date.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {/* Incomes */}
              {selectedIncomes.map((inc) => (
                <div key={inc.id} className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">{inc.source}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">{inc.category}</span>
                  </div>
                  <span className="font-bold text-emerald-600">+{formatINR(inc.amount)}</span>
                </div>
              ))}

              {/* Expenses */}
              {selectedExpenses.map((exp) => (
                <div key={exp.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">{exp.description}</span>
                    <span className="text-[10px] text-slate-500">{exp.category} {exp.time && `• ${exp.time}`}</span>
                  </div>
                  <span className="font-bold text-rose-600">-{formatINR(exp.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
