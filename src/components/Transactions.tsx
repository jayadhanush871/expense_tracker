import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Trash2,
  Edit2,
  Calendar,
  ArrowUpDown,
  Plus
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, Income, Profile } from '../types';
import { formatINR } from '../services/api';

interface TransactionsProps {
  profile: Profile | null;
  expenses: Expense[];
  incomes: Income[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => Promise<void>;
  onEditIncome: (income: Income) => void;
  onDeleteIncome: (id: string) => Promise<void>;
  onOpenAddIncome: () => void;
}

export const Transactions: React.FC<TransactionsProps> = ({
  profile,
  expenses,
  incomes,
  onEditExpense,
  onDeleteExpense,
  onEditIncome,
  onDeleteIncome,
  onOpenAddIncome
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Unified items
  const unifiedList = [
    ...expenses.map(e => ({
      ...e,
      type: 'expense' as const,
      displayTitle: e.description,
    })),
    ...incomes.map(i => ({
      ...i,
      time: '00:00:00',
      type: 'income' as const,
      displayTitle: i.source,
    }))
  ];

  // Extract distinct categories
  const categories = Array.from(new Set(unifiedList.map(item => item.category)));

  // Filter items
  const filteredItems = unifiedList.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    if (searchTerm) {
      const matchSearch =
        item.displayTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
    }
    return true;
  });

  // Sort items
  filteredItems.sort((a, b) => {
    if (sortBy === 'date-desc') {
      return new Date(`${b.date}T${b.time || '00:00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00:00'}`).getTime();
    }
    if (sortBy === 'date-asc') {
      return new Date(`${a.date}T${a.time || '00:00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00:00'}`).getTime();
    }
    if (sortBy === 'amount-desc') {
      return Number(b.amount) - Number(a.amount);
    }
    if (sortBy === 'amount-asc') {
      return Number(a.amount) - Number(b.amount);
    }
    return 0;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Time', 'Type', 'Category', 'Description', 'Amount (INR)'];
    const rows = filteredItems.map(item => [
      item.date,
      item.time || '',
      item.type.toUpperCase(),
      `"${item.category}"`,
      `"${item.displayTitle.replace(/"/g, '""')}"`,
      item.amount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ExpenseTrack_Statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const userName = profile?.full_name || 'User';

    // Header styling
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text('Personal Expense Tracker', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Account Statement for: ${userName} (${profile?.email || 'N/A'})`, 14, 28);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);

    // Summary calculation
    const totalExp = filteredItems.filter(i => i.type === 'expense').reduce((s, i) => s + Number(i.amount), 0);
    const totalInc = filteredItems.filter(i => i.type === 'income').reduce((s, i) => s + Number(i.amount), 0);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Income: Rs. ${totalInc.toLocaleString('en-IN')}  |  Total Expenses: Rs. ${totalExp.toLocaleString('en-IN')}  |  Net: Rs. ${(totalInc - totalExp).toLocaleString('en-IN')}`, 14, 42);

    // Table
    const tableData = filteredItems.map(item => [
      item.date,
      item.type.toUpperCase(),
      item.category,
      item.displayTitle,
      (item.type === 'income' ? '+ ' : '- ') + `Rs. ${Number(item.amount).toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      startY: 48,
      head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
      body: tableData,
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`ExpenseTrack_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Title & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Transaction History</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Search, filter, edit, and export your complete financial records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddIncome}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Income</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs transition-colors flex items-center space-x-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs transition-colors flex items-center space-x-1.5"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by description or category..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Type Filter */}
          <div className="sm:col-span-3">
            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div className="sm:col-span-2">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center space-x-1 font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            <span>Date Range:</span>
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          />
          {(startDate || endDate || searchTerm || selectedCategory !== 'all' || filterType !== 'all') && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchTerm('');
                setSelectedCategory('all');
                setFilterType('all');
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No transactions match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div>{item.date}</div>
                      {item.time && <div className="text-[10px] text-slate-400">{item.time}</div>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.type === 'income'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {item.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                        {item.displayTitle}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-sm whitespace-nowrap">
                      <span
                        className={
                          item.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-white'
                        }
                      >
                        {item.type === 'income' ? '+' : '-'}
                        {formatINR(item.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() => {
                            if (item.type === 'expense') {
                              onEditExpense(item as any);
                            } else {
                              onEditIncome(item as any);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete "${item.displayTitle}"?`)) {
                              if (item.type === 'expense') {
                                await onDeleteExpense(item.id);
                              } else {
                                await onDeleteIncome(item.id);
                              }
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
