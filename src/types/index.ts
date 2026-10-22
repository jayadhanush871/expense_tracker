export interface Profile {
  id?: string;
  full_name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: string;
  user_email: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  time: string;
  created_at: string;
}

export interface Income {
  id: string;
  user_email: string;
  amount: number;
  source: string;
  category: string;
  date: string;
  created_at: string;
}

export interface BudgetSettings {
  weekly_budget: number | null;
  monthly_budget: number | null;
  category_budgets: Record<string, number>;
  updated_at?: string;
}

export interface SavingsGoal {
  id: string;
  user_email: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  target_date?: string | null;
  created_at: string;
}

export interface WeeklyReportSettings {
  is_active: boolean;
  delivery_day: string;
  delivery_time: string;
  timezone: string;
  last_sent_period?: string | null;
  updated_at?: string;
}

export interface DailyBreakdownItem {
  date: string;
  day: string;
  shortDay: string;
  total: number;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface WeeklySummary {
  userName: string;
  recipientEmail: string;
  periodStart: string;
  periodEnd: string;
  periodKey: string;
  totalExpenses: number;
  totalIncome: number;
  netCashFlow: number;
  weeklyBudget: number | null;
  isBudgetSet: boolean;
  remainingBudget: number | null;
  budgetUtilizedPct: number;
  transactionCount: number;
  highestExpense: Expense | null;
  averageDailySpending: number;
  dailyBreakdown: DailyBreakdownItem[];
  categoryBreakdown: CategoryBreakdownItem[];
  prevTotalExpenses: number;
  spendingDifference: number;
  spendingChangePct: number;
  factualSummary: string;
}

export interface EmailLog {
  id: string;
  user_email: string;
  recipient: string;
  period_start: string;
  period_end: string;
  status: 'SUCCESS' | 'FAILED';
  total_expense: number;
  total_income: number;
  transactions_count: number;
  error_message?: string | null;
  sent_at: string;
}

export interface SystemStatus {
  status: string;
  storage_type: 'supabase' | 'local_storage';
  supabase_configured: boolean;
  supabase_url: string | null;
  resend_configured: boolean;
  sender_email: string;
  scheduler: {
    is_running: boolean;
    last_check: string | null;
    last_run_result: any;
    system_time: string;
  };
}
