# 💰 Personal Expense Tracker with Automated Weekly Email Reports & Persistent Storage

A modern, full-featured Personal Expense Tracker built with **React 18, TypeScript, Tailwind CSS, Express, Formspree (https://formspree.io/f/moejgbov), Resend, and Supabase / Local Persistent Storage**.

---

## 🌟 Key Updates & Specifications

### 1. 📧 Formspree Form Data Storage & Real Email Delivery
- **Connected Endpoint**: `https://formspree.io/f/moejgbov`
- **Instant Cloud Form Storage**: Profile updates and weekly reports are submitted directly to Formspree for immediate form storage and email delivery.
- **Ask User for Email**: When dispatching weekly financial reports or verification tests, the app directly prompts and asks the user to confirm/enter the target recipient email address.
- **Zero Configuration Required**: Functions immediately out-of-the-box using the active Formspree endpoint with zero setup hurdles!

### 2. 0️⃣ Initial Expenses Start at ₹0
- **Clean Starting State**: When starting the application, expenses are initialized strictly at **₹0** across **0 transactions**.
- **Calculations Trigger on Addition**: Financial metrics, budget utilization %, daily averages, and category distributions only start calculating after you add an expense using the quick-add form!
- **Minimalist & Secure**: Exactly two fields — **Full Name** and **Email Address**.
- **No Unnecessary Clutter**: Never asks for phone numbers, profile photos, addresses, date of birth, or occupation.
- **Dynamic Usage**: Your saved name powers personalized dashboard greetings (`"Good morning, Dhanush!"`) and weekly email greetings (`"Hello Dhanush,"`).
- **Update Anytime**: Easily update both details at any time from the top navigation bar.

### 2. ⚡ Quick-Add Expense with Automatic Time & Category
- **Only Two Fields**: **Amount (₹)** and **What I spent it on** (e.g., `"Tea and snacks"`).
- **Auto Date & Time**: Automatically captured from the system device when you save.
- **Intelligent Category Auto-Detection**: Real-time keyword engine automatically detects categories:
  - `"Tea and snacks"`, `"Swiggy biryani"` &rarr; **Food & Drinks**
  - `"Uber to office"`, `"Petrol"` &rarr; **Transportation**
  - `"Amazon clothes"`, `"Groceries"` &rarr; **Shopping**
  - `"Electricity bill"`, `"WiFi recharge"` &rarr; **Bills & Utilities**
  - `"Netflix"`, `"Movie tickets"` &rarr; **Entertainment**
  - `"Medicine"`, `"Doctor consultation"` &rarr; **Health & Wellness**
  - *Optional Category Override*: Click the detected category badge anytime to choose another category.

### 3. 📧 Automated Weekly Email Reports (Powered by Resend)
- **Automatic Weekly Delivery**: Automatically calculates the past 7-day financial summary and delivers a responsive HTML & plain-text report to your saved email.
- **Comprehensive Email Content**:
  - Personalized greeting with your name.
  - Reporting period dates (e.g., Oct 15, 2026 - Oct 21, 2026).
  - Total expenses for the week.
  - Total income & net cash flow (if income recorded).
  - Weekly budget, amount spent against budget, remaining budget, and utilization percentage.
  - Daily spending breakdown table (Monday through Sunday).
  - Category-wise expense breakdown with percentages.
  - Highest expense of the week with date and category.
  - Average daily spending across active days.
  - Comparison with the previous week (% increase/decrease).
  - Transaction count and a factual summary paragraph based entirely on actual records.
- **Zero Spending Handling**: If there are no expenses during the week, reports zero spending rather than inventing mock transactions.
- **Duplicate Prevention Guard**: Tracks reporting periods so duplicate reports are never sent for the same period.
- **Audit Logging & Retries**: Every delivery attempt is logged in `email_delivery_logs` with recipient, status, and retry capability.

### 4. 🎯 Budget Management & Warning Thresholds
- **Separate Setup**: Keep budget setup completely separate from expense logging.
- **Flexible Configuration**: Configure Weekly Budget, Monthly Budget, and optional Category-Specific Budgets.
- **Formulas**:
  - $\text{Budget Remaining} = \text{Budget} - \text{Actual Expenses}$
  - $\text{Budget Utilization \%} = \frac{\text{Actual Expenses}}{\text{Budget}} \times 100$
- **Accurate Handling**: Distinguishes between unset budgets (`null`) and zero budgets (`₹0`).
- **Automated Threshold Warnings**:
  - 🟡 **50% Reached**: Gentle advisory threshold
  - 🟠 **75% Warning**: High spending attention
  - 🔴 **90% Caution**: Critical budget threshold
  - 🚨 **100%+ Exceeded**: Over-budget alarm

### 5. 📊 Complete Financial Tools
- **Dashboard**: Net balance card, income, expense, and budget progress bars.
- **Analytics**: Daily, weekly, monthly, and yearly timeframes with interactive Chart.js charts.
- **Transaction History**: Filter by type, category, date range, or description search, with sorting.
- **Reports Export**: One-click download as **CSV** or styled **PDF** statements.
- **Income & Savings Goals**: Track earnings, set savings goals with target dates, deposit funds, and celebrate milestones.
- **Interactive Calendar**: Month-view calendar displaying daily spending dots; click any date to view all transactions recorded on that day.
- **Themes & Responsive Design**: Seamless Dark/Light mode toggle and polished mobile/desktop layouts.

---

## 🚀 Quick Start Guide

### 1. Installation
In the project directory, install dependencies:
\`\`\`bash
npm install
\`\`\`

### 2. Environment Variables Setup
Copy `.env.example` to `.env`:
\`\`\`bash
cp .env.example .env
\`\`\`

Your `.env` file contains:
\`\`\`env
# Server Configuration
PORT=5000
NODE_ENV=development

# Resend Email Delivery API Key (https://resend.com)
RESEND_API_KEY=

# Sender Email Address (default test address provided by Resend)
SENDER_EMAIL=Expense Tracker <onboarding@resend.dev>

# Secret token used to protect report generation & cron trigger endpoints
CRON_SECRET=expense_tracker_secure_token_2026

# Supabase Persistent Cloud Storage (Optional - Local file database is used when empty)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
\`\`\`

> [!NOTE]
> **Out-of-the-Box Local Storage**: If `SUPABASE_URL` is left empty, the application automatically uses a local persistent file database (`server/data/store.json`). Everything works immediately with zero configuration!

---

### 3. Run the Application
Start both the Express backend API and Vite frontend server together with a single command:
\`\`\`bash
npm run dev
\`\`\`

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API Server**: [http://localhost:5000/api](http://localhost:5000/api)

---

## 📧 How to Configure Real Email Delivery (Resend)

1. Sign up for a free account at [https://resend.com](https://resend.com).
2. Go to **API Keys** and generate a new key (starts with `re_...`).
3. Open `.env` and set:
   \`\`\`env
   RESEND_API_KEY=re_your_api_key_here
   SENDER_EMAIL=Expense Tracker <onboarding@resend.dev>
   \`\`\`
   *(Note: Resend allows sending to your own verified account email using `onboarding@resend.dev`. Once you add and verify a custom domain in Resend, you can send to any email address using e.g. `reports@yourdomain.com`)*.
4. Open the web application and navigate to the **Weekly Email** tab.
5. Click **"Send Test Verification Email"** to test your connection instantly.
6. Click **"Send Report Email"** to dispatch your weekly financial report.

---

## ⏰ Automated Weekly Email Scheduler

The application offers two reliable scheduling approaches:

### Method A: Built-in Timezone-Aware Background Scheduler
The Express backend includes an integrated `node-cron` background worker that executes every minute. It checks:
1. Whether **Automatic Weekly Reports** is toggled ON.
2. If today matches your preferred delivery day (e.g., `Sunday`).
3. If the current time matches your preferred delivery time (e.g., `09:00`) in your configured **Timezone** (e.g., `Asia/Kolkata`).
4. Checks duplicate prevention (`last_sent_period`) to ensure reports are sent only once per week.

You can also run the scheduler as a standalone background process:
\`\`\`bash
npm run scheduler
\`\`\`

### Method B: Supabase pg_cron / Cloud Webhook
You can trigger weekly report generation using an external scheduler or Supabase `pg_cron` with the secure token:
\`\`\`bash
curl -X POST http://localhost:5000/api/reports/send-weekly \
  -H "Authorization: Bearer expense_tracker_secure_token_2026" \
  -H "Content-Type: application/json"
\`\`\`

---

## 🗄️ Database Setup (Supabase PostgreSQL)

When you're ready to migrate from local storage to cloud Supabase:

1. Create a project at [https://supabase.com](https://supabase.com).
2. Navigate to **SQL Editor** and execute the entire content of [`supabase-schema.sql`](./supabase-schema.sql).
3. This creates all 8 required tables:
   - `profiles`
   - `expenses`
   - `incomes`
   - `budget_settings`
   - `categories`
   - `savings_goals`
   - `weekly_report_settings`
   - `email_delivery_logs`
   - Row Level Security (RLS) policies and performance indexes.
4. Copy your **Project URL** and **Service Role Key** (or Anon Key) from **Project Settings &rarr; API**.
5. Paste them into `.env`:
   \`\`\`env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   \`\`\`
6. Restart the server (`npm run dev`). The app will display **"Supabase Cloud Database (PostgreSQL)"** active.

---

## 🧪 Automated Verification & Testing

To run the automated verification test suite:
\`\`\`bash
node scripts/test-verification.mjs
\`\`\`

This script tests and verifies all 7 user requirements:
1. Simple Profile creation with name and email validation.
2. Quick-add expense of ₹40 for "Tea and snacks" with auto date, auto time, and auto category detection.
3. Persistent storage confirmation in database.
4. Weekly and monthly budget configuration and threshold calculations.
5. Weekly financial report calculation from saved records.
6. Responsive HTML and plain-text email generation.
7. Resend email dispatch, duplicate prevention, and audit logging.
8. Zero spending handling for weeks with no transactions.
