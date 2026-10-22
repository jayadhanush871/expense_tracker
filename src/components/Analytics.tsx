import React, { useState } from 'react';
import {
  BarChart3,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Receipt,
  Sparkles
} from 'lucide-react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Expense, Income } from '../types';
import { formatINR } from '../services/api';

interface AnalyticsProps {
  expenses: Expense[];
  incomes: Income[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ expenses, incomes }) => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Filter expenses and previous period expenses based on timeframe
  let startDate = new Date();
  let prevStartDate = new Date();
  let prevEndDate = new Date();

  if (timeframe === 'daily') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  } else if (timeframe === 'weekly') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 6);
    prevEndDate = new Date(startDate);
    prevEndDate.setDate(startDate.getDate() - 1);
    prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevEndDate.getDate() - 6);
  } else if (timeframe === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (timeframe === 'yearly') {
    startDate = new Date(now.getFullYear(), 0, 1);
    prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
    prevEndDate = new Date(now.getFullYear() - 1, 11, 31);
  }

  const startStr = startDate.toISOString().split('T')[0];
  const prevStartStr = prevStartDate.toISOString().split('T')[0];
  const prevEndStr = prevEndDate.toISOString().split('T')[0];

  const filteredExpenses = expenses.filter(e => e.date >= startStr && e.date <= todayStr);
  const prevExpenses = expenses.filter(e => e.date >= prevStartStr && e.date <= prevEndStr);

  const totalPeriodSpent = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const prevPeriodSpent = prevExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Percentage change
  let changePct = 0;
  if (prevPeriodSpent > 0) {
    changePct = ((totalPeriodSpent - prevPeriodSpent) / prevPeriodSpent) * 100;
  } else if (totalPeriodSpent > 0) {
    changePct = 100;
  }

  // Highest expense
  const highestExpense = filteredExpenses.length > 0
    ? filteredExpenses.reduce((max, e) => (Number(e.amount) > Number(max.amount) ? e : max), filteredExpenses[0])
    : null;

  // Number of days in active period
  const diffTime = Math.abs(now.getTime() - startDate.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const dailyAverage = totalPeriodSpent / diffDays;

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  filteredExpenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount);
  });

  const categoryEntries = Object.entries(categoryMap)
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      pct: totalPeriodSpent > 0 ? (amt / totalPeriodSpent) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const doughnutData = {
    labels: categoryEntries.length > 0 ? categoryEntries.map(c => c.category) : ['No Data'],
    datasets: [
      {
        data: categoryEntries.length > 0 ? categoryEntries.map(c => c.amount) : [1],
        backgroundColor: [
          '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'
        ],
        borderWidth: 0,
      },
    ],
  };

  // Timeline chart
  const timelineDataMap: Record<string, number> = {};
  filteredExpenses.forEach(e => {
    timelineDataMap[e.date] = (timelineDataMap[e.date] || 0) + Number(e.amount);
  });

  const sortedDates = Object.keys(timelineDataMap).sort();
  const timelineData = {
    labels: sortedDates.length > 0 ? sortedDates.map(d => d.slice(5)) : ['None'],
    datasets: [
      {
        label: 'Spending (₹)',
        data: sortedDates.length > 0 ? sortedDates.map(d => timelineDataMap[d]) : [0],
        backgroundColor: '#6366f1',
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <span>Financial Analytics & Insights</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Compare spending patterns, category shares, and previous periods
          </p>
        </div>

        {/* Timeframe Selector Pills */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                timeframe === t
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Spent ({timeframe})</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {formatINR(totalPeriodSpent)}
          </div>
          <div className="flex items-center space-x-1 mt-2 text-xs">
            {changePct !== 0 ? (
              <span className={`inline-flex items-center font-bold ${changePct > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {changePct > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(changePct).toFixed(1)}%
              </span>
            ) : (
              <span className="text-slate-400">0%</span>
            )}
            <span className="text-slate-500 dark:text-slate-400">vs prev {timeframe}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">Average Daily Spend</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatINR(dailyAverage)}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 block">
            Across {diffDays} tracked day{diffDays === 1 ? '' : 's'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">Highest Expense</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 truncate">
            {highestExpense ? formatINR(highestExpense.amount) : '₹0'}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 block truncate">
            {highestExpense ? `${highestExpense.description} (${highestExpense.category})` : 'No expenses in period'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">Transactions Count</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {filteredExpenses.length}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 block">
            Previous period: {prevExpenses.length} transactions
          </span>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown Chart (6 Cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Category Distribution</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Percentage share of total period expenses</p>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
                }
              }}
            />
          </div>

          {/* Breakdown Table */}
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
            {categoryEntries.slice(0, 5).map(cat => (
              <div key={cat.category} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.category}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-900 dark:text-white font-bold">{formatINR(cat.amount)}</span>
                  <span className="text-slate-400 font-mono">({cat.pct.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spending Trend Bar Chart (6 Cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Spending Timeline</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Daily expenditure activity</p>
          <div className="h-64 flex items-center justify-center">
            <Bar
              data={timelineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
                  x: { grid: { display: false } }
                }
              }}
            />
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-400">
            <strong>Spending Fact:</strong> Total of {filteredExpenses.length} transactions recorded between {startStr} and {todayStr}.
          </div>
        </div>
      </div>
    </div>
  );
};
