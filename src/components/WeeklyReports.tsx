import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  RotateCcw
} from 'lucide-react';
import {
  WeeklyReportSettings,
  WeeklySummary,
  EmailLog,
  Profile,
  SystemStatus
} from '../types';
import { api, formatINR } from '../services/api';

interface WeeklyReportsProps {
  profile: Profile | null;
  reportSettings: WeeklyReportSettings;
  status: SystemStatus | null;
  onSaveReportSettings: (settings: Partial<WeeklyReportSettings>) => Promise<void>;
  onOpenProfile: () => void;
  onRefreshStatus: () => Promise<void>;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney'
];

export const WeeklyReports: React.FC<WeeklyReportsProps> = ({
  profile,
  reportSettings,
  status,
  onSaveReportSettings,
  onOpenProfile,
  onRefreshStatus
}) => {
  const [isActive, setIsActive] = useState(reportSettings.is_active);
  const [deliveryDay, setDeliveryDay] = useState(reportSettings.delivery_day || 'Sunday');
  const [deliveryTime, setDeliveryTime] = useState(reportSettings.delivery_time || '09:00');
  const [timezone, setTimezone] = useState(reportSettings.timezone || 'Asia/Kolkata');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Live Summary State
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Delivery Logs
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Actions state
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [recipientInput, setRecipientInput] = useState(profile?.email || '');

  useEffect(() => {
    if (profile?.email && !recipientInput) {
      setRecipientInput(profile.email);
    }
  }, [profile]);

  useEffect(() => {
    setIsActive(reportSettings.is_active);
    setDeliveryDay(reportSettings.delivery_day || 'Sunday');
    setDeliveryTime(reportSettings.delivery_time || '09:00');
    setTimezone(reportSettings.timezone || 'Asia/Kolkata');
  }, [reportSettings]);

  const loadData = async () => {
    try {
      setIsLoadingSummary(true);
      const sum = await api.getWeeklySummary();
      setSummary(sum);
    } catch (err: any) {
      console.error('Error fetching weekly summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }

    try {
      setIsLoadingLogs(true);
      const l = await api.getEmailLogs();
      setLogs(l);
    } catch (err: any) {
      console.error('Error fetching email logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      await onSaveReportSettings({
        is_active: isActive,
        delivery_day: deliveryDay,
        delivery_time: deliveryTime,
        timezone: timezone
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSendWeeklyReport = async (force = false) => {
    const target = recipientInput.trim() || profile?.email;
    if (!target) {
      alert('Please enter or confirm the recipient email address first.');
      return;
    }

    try {
      setIsSendingReport(true);
      setSendResult(null);
      const res = await api.sendWeeklyReport({ force, email: target });
      if (res.skipped) {
        setSendResult({
          success: true,
          message: res.message || 'Report already dispatched for this period. To re-send, click Force Re-send.'
        });
      } else if (res.success) {
        setSendResult({
          success: true,
          message: `Weekly report successfully dispatched to ${target} via Formspree!`
        });
      } else {
        setSendResult({
          success: false,
          message: res.error || 'Failed to send report. Please check your credentials.'
        });
      }
      await loadData();
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.message || 'An error occurred while sending the email.'
      });
    } finally {
      setIsSendingReport(false);
    }
  };

  const handleSendTestEmail = async () => {
    const target = recipientInput.trim() || profile?.email;
    if (!target) {
      alert('Please enter or confirm the recipient email address first.');
      return;
    }

    try {
      setIsSendingTest(true);
      setTestResult(null);
      const res = await api.sendTestEmail(target);
      if (res.success) {
        setTestResult({
          success: true,
          message: `Verification test email dispatched to ${target} via Formspree! Check your inbox.`
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Test email failed.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to send test email.'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRetryEmail = async (logId: string) => {
    try {
      await api.retryEmail(logId);
      alert('Retry triggered! Check logs in a moment.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Retry failed');
    }
  };

  const isEmailServiceReady = status?.formspree_configured || status?.resend_configured;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
          <Mail className="w-5 h-5 text-indigo-600" />
          <span>Weekly Financial Email Reports & Delivery Engine</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Calculates comprehensive weekly summaries and dispatches formatted reports to your email via Formspree.
        </p>
      </div>

      {/* 1. Email Service Status & Credentials Card */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isEmailServiceReady
          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
          : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-xl mt-0.5 ${
              isEmailServiceReady
                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
            }`}>
              {isEmailServiceReady ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Email Service Status:{' '}
                  <span className={isEmailServiceReady ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                    {isEmailServiceReady ? 'Formspree Connected & Active' : 'Setup Required'}
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {isEmailServiceReady
                  ? `Active Formspree endpoint: "https://formspree.io/f/moejgbov". Ready to store form data and deliver weekly reports!`
                  : 'Email endpoint is not configured.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center space-x-1"
            >
              <span>{showSetupGuide ? 'Hide Details' : 'Formspree Details'}</span>
              {showSetupGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onRefreshStatus}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              title="Refresh connection status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Formspree Endpoint Details */}
        {showSetupGuide && (
          <div className="mt-4 pt-4 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="font-bold text-slate-900 dark:text-white">
              Form Data Storage & Email Delivery:
            </div>
            <p>
              Your application is configured with the Formspree endpoint <code className="bg-white/80 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-400 font-bold">https://formspree.io/f/moejgbov</code>.
            </p>
            <p>
              Every time you submit a profile update or dispatch a weekly report, the structured financial data is stored securely in Formspree and delivered immediately as an email to the configured inbox!
            </p>
          </div>
        )}
      </div>

      {/* 2. Schedule Configuration & Quick Triggers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Schedule Settings Form (6 Cols) */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Weekly Delivery Schedule</h3>
            </div>
            {settingsSuccess && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Schedule Saved!</span>
              </span>
            )}
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Automatic Weekly Reports
              </span>
              <span className="text-[11px] text-slate-500">
                Trigger email automatically once every week
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          {/* Delivery Day & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Delivery Day
              </label>
              <select
                value={deliveryDay}
                onChange={(e) => setDeliveryDay(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Delivery Time
              </label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Configured Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {/* Saved Recipient */}
          <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">RECIPIENT ADDRESS</span>
              <strong className="text-indigo-950 dark:text-indigo-200">
                {profile?.email || 'No email saved in profile'}
              </strong>
            </div>
            <button
              type="button"
              onClick={onOpenProfile}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Change
            </button>
          </div>

          <button
            type="submit"
            disabled={isSavingSettings}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            {isSavingSettings ? 'Saving...' : 'Save Schedule Settings'}
          </button>
        </form>

        {/* Immediate Delivery & Testing Controls (6 Cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Send className="w-4 h-4 text-indigo-600" />
              <span>Email Delivery Actions</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verify your setup or trigger an immediate report delivery
            </p>
          </div>

          {/* Ask User for Recipient Email */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
            <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200">
              Recipient Email (Ask / Confirm):
            </label>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Enter or confirm the email address to receive this report:
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                placeholder="e.g. dhanush@example.com"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {profile?.email && recipientInput !== profile.email && (
                <button
                  type="button"
                  onClick={() => setRecipientInput(profile.email)}
                  className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:underline whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Action 1: Send Weekly Report Now */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  Send Weekly Financial Report Now
                </span>
                <span className="text-[11px] text-slate-500">
                  Calculates past 7-day totals and sends to {recipientInput || profile?.email || 'recipient'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => handleSendWeeklyReport(false)}
                disabled={isSendingReport}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingReport ? 'Sending...' : 'Send Report Email'}</span>
              </button>

              <button
                onClick={() => handleSendWeeklyReport(true)}
                disabled={isSendingReport}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all"
                title="Bypasses duplicate prevention check for testing"
              >
                Force Re-send
              </button>
            </div>

            {sendResult && (
              <div className={`mt-2 p-2.5 rounded-lg text-xs flex items-start space-x-2 ${
                sendResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200'
              }`}>
                {sendResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{sendResult.message}</span>
              </div>
            )}
          </div>

          {/* Action 2: Send Test Verification Email */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                Send Test Verification Email
              </span>
              <span className="text-[11px] text-slate-500">
                Instantly tests Resend SMTP API keys and deliverability
              </span>
            </div>

            <button
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{isSendingTest ? 'Testing Connection...' : 'Send Test Email'}</span>
            </button>

            {testResult && (
              <div className={`mt-2 p-2.5 rounded-lg text-xs flex items-start space-x-2 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            <strong>Duplicate Guard Active:</strong> Reports are marked with a period key (e.g. <code>2026-10-15_to_2026-10-21</code>) to prevent duplicate delivery in the same week.
          </div>
        </div>
      </div>

      {/* 3. Live Report Preview Section (Calculated from saved database records) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Live Weekly Report Preview
            </h3>
            <span className="text-[11px] text-slate-500 font-normal">
              (Calculated directly from saved records)
            </span>
          </div>

          <button
            onClick={loadData}
            disabled={isLoadingSummary}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSummary ? 'animate-spin' : ''}`} />
            <span>Recalculate</span>
          </button>
        </div>

        {summary ? (
          <div className="p-6 space-y-6">
            {/* Email Subject & Greeting Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-xs font-mono text-slate-500">
                <strong>Subject:</strong> Your Weekly Expense and Budget Report ({summary.periodStart} - {summary.periodEnd})
              </div>
              <div className="text-xs font-mono text-slate-500">
                <strong>To:</strong> {summary.userName} &lt;{summary.recipientEmail}&gt;
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                Hello {summary.userName},
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Here is your weekly financial summary for the period{' '}
                <strong>{summary.periodStart}</strong> to <strong>{summary.periodEnd}</strong>.
              </div>
            </div>

            {/* Factual Summary Callout */}
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-600 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong className="text-indigo-950 dark:text-indigo-200 block mb-1">
                Factual Spending Overview:
              </strong>
              {summary.factualSummary}
            </div>

            {/* Calculated KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Expenses</span>
                <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {formatINR(summary.totalExpenses)}
                </div>
                <span className="text-[10px] text-slate-500">{summary.transactionCount} transactions</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-400">Weekly Budget</span>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {summary.isBudgetSet ? formatINR(summary.weeklyBudget) : 'Not Configured'}
                </div>
                <span className="text-[10px] text-slate-500">
                  Remaining: {summary.isBudgetSet ? formatINR(summary.remainingBudget) : 'N/A'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-400">Budget Utilized</span>
                <div className={`text-xl font-black mt-1 ${
                  summary.budgetUtilizedPct >= 100 ? 'text-red-500' : summary.budgetUtilizedPct >= 75 ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {summary.isBudgetSet ? `${summary.budgetUtilizedPct.toFixed(1)}%` : 'N/A'}
                </div>
                <span className="text-[10px] text-slate-500">
                  Avg: {formatINR(summary.averageDailySpending)}/day
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-400">vs Previous Week</span>
                <div className={`text-xl font-black mt-1 ${summary.spendingChangePct > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {summary.spendingChangePct > 0 ? '+' : ''}{summary.spendingChangePct.toFixed(1)}%
                </div>
                <span className="text-[10px] text-slate-500">
                  Prev: {formatINR(summary.prevTotalExpenses)}
                </span>
              </div>
            </div>

            {/* Tables Grid: Category & Daily Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  Category Breakdown
                </div>
                {summary.categoryBreakdown.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No expenses recorded across categories during this week.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {summary.categoryBreakdown.map((cat) => (
                        <tr key={cat.category}>
                          <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {cat.category}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                            {formatINR(cat.amount)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-500 font-mono">
                            {cat.percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Daily Breakdown */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  Daily Spending Breakdown
                </div>
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {summary.dailyBreakdown.map((day) => (
                      <tr key={day.date}>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {day.day}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {day.date}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {formatINR(day.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading live summary calculations...
          </div>
        )}
      </div>

      {/* 4. Delivery Audit Logs & History */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Email Delivery Logs & Audit Trail
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete dispatch history with status, recipient, and retry options
            </p>
          </div>

          <button
            onClick={loadData}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Logs</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No email delivery logs recorded yet. Use the "Send Report Email" button above to send your first report!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Transactions</th>
                  <th className="py-3 px-4 text-right">Total Expense</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.sent_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                      {log.period_start} to {log.period_end}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {log.recipient}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200'
                      }`}>
                        {log.status}
                      </span>
                      {log.error_message && (
                        <span className="block text-[10px] text-red-500 mt-0.5 truncate max-w-xs" title={log.error_message}>
                          {log.error_message}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {log.transactions_count}
                    </td>
                    <td className="py-3 px-4 text-right font-black">
                      {formatINR(log.total_expense)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {log.status === 'FAILED' ? (
                        <button
                          onClick={() => handleRetryEmail(log.id)}
                          className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 flex items-center space-x-1 ml-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Delivered</span>
                      )}
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
