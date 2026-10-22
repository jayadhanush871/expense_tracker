-- ============================================================================
-- PERSONAL EXPENSE TRACKER - SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Execute this script in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- to create all tables, indexes, constraints, and Row Level Security policies.

-- 1. Profiles Table (Simple Profile: Full Name and Email Address only)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) > 0),
    email TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Expense Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT NOT NULL DEFAULT 'Tag',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Insert Default Expense Categories
INSERT INTO public.categories (name, color, icon) VALUES
    ('Food & Drinks', '#f59e0b', 'Utensils'),
    ('Transportation', '#3b82f6', 'Car'),
    ('Shopping', '#ec4899', 'ShoppingBag'),
    ('Bills & Utilities', '#ef4444', 'Zap'),
    ('Entertainment', '#8b5cf6', 'Film'),
    ('Health & Wellness', '#10b981', 'HeartPulse'),
    ('Education', '#06b6d4', 'GraduationCap'),
    ('Other', '#64748b', 'MoreHorizontal')
ON CONFLICT (name) DO NOTHING;

-- 3. Expenses Table (Quick-add: Amount + Description + Auto Date/Time + Auto Category)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL DEFAULT CURRENT_TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Income Transactions Table
CREATE TABLE IF NOT EXISTS public.incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    source TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Salary',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Budget Settings (Weekly, Monthly, and Category-Specific)
CREATE TABLE IF NOT EXISTS public.budget_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL UNIQUE,
    weekly_budget NUMERIC(12, 2) DEFAULT NULL,
    monthly_budget NUMERIC(12, 2) DEFAULT NULL,
    category_budgets JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Savings Goals Table
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    saved_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
    target_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Weekly Report Settings Table
CREATE TABLE IF NOT EXISTS public.weekly_report_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    delivery_day TEXT NOT NULL DEFAULT 'Sunday', -- Sunday, Monday, etc.
    delivery_time TEXT NOT NULL DEFAULT '09:00', -- 24h format HH:MM
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    last_sent_period TEXT DEFAULT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Email Delivery Logs Table (Audit & retry logs)
CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    recipient TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
    total_expense NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
    transactions_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT DEFAULT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses (user_email, date DESC);
CREATE INDEX IF NOT EXISTS idx_incomes_user_date ON public.incomes (user_email, date DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_sent ON public.email_delivery_logs (user_email, sent_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_report_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Note for RLS Policies:
-- If using Supabase Auth with JWT, policies can filter by `auth.email() = user_email`.
-- If calling from the secure Express backend using SUPABASE_SERVICE_ROLE_KEY,
-- the service role bypasses RLS safely while keeping client access locked down.

-- ============================================================================
-- OPTIONAL: Supabase pg_cron Weekly Job (If using Supabase Database Extensions)
-- ============================================================================
-- Enable pg_cron and pg_net in Supabase Dashboard -> Database -> Extensions
--
-- Example Cron to invoke the backend weekly report trigger every Sunday at 09:00 UTC:
--
-- SELECT cron.schedule(
--   'weekly-expense-report',
--   '0 9 * * 0',
--   $$
--   SELECT net.http_post(
--     url := 'https://your-domain.com/api/reports/send-weekly',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer expense_tracker_secure_token_2026"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
