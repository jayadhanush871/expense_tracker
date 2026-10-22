# 💰 Personal Expense Tracker

[![React](https://img.shields.io/badge/React-18.3-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Formspree](https://img.shields.io/badge/Formspree-Connected-e51075?style=for-the-badge&logo=mailgun&logoColor=white)](https://formspree.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> A fast, privacy-conscious personal expense tracker featuring quick-add transactions with automatic category detection, dynamic budget management, interactive analytics, and automated Sunday weekly financial email reports powered by Formspree.

---

## 📖 About The Project

Managing everyday personal finances shouldn't be cumbersome or intrusive. **Personal Expense Tracker** is designed with a **minimal-friction philosophy**:

1. **Frictionless Expense Logging**: Record expenses with just two fields (**Amount** and **What I spent it on**). The system takes care of the timestamp and automatically detects the expense category using an intelligent real-time keyword classifier.
2. **Automated Weekly Financial Summaries**: Every Sunday at midnight (12:00 AM), a structured report is compiled from your actual records and delivered directly to your inbox via [Formspree](https://formspree.io/f/moejgbov).
3. **Strict Minimal Email Format**: Form notifications and emails focus strictly on what matters — a clean table of transactions (`date`, `amount`, `spent on`, `category`), followed only by `total spent` and `balance`, with zero unwanted fluff.
4. **Simple & Private Account**: Create a profile in seconds with only your **Full Name** and **Email Address**. No phone numbers, photos, birth dates, or addresses are ever requested. Your account is remembered on restart without annoying re-prompts, and your email can be updated at any time.
5. **Dynamic Budgets**: Configure weekly, monthly, and category-specific spending limits with automated threshold alerts (50%, 75%, 90%, 100%+). Your weekly budget is fully adjustable anytime without being locked to fixed defaults.
6. **Zero-Configuration Ready**: Runs instantly with an embedded persistent file database (`server/data/store.json`) or connects seamlessly to cloud PostgreSQL via **Supabase**.

---

## ✨ Key Features

### ⚡ 1. 2-Field Quick-Add with Smart Categorization
- **Fast Entry**: Enter only the **Amount (₹)** and **Description** (e.g., `Tea and snacks`, `Uber to office`, `Amazon clothes`).
- **Automatic Timestamps**: Date and exact system time are captured automatically upon saving.
- **Auto Category Detection**:
  - `Tea`, `Coffee`, `Lunch`, `Dinner`, `Swiggy` &rarr; **Food & Drinks**
  - `Uber`, `Ola`, `Fuel`, `Metro`, `Bus` &rarr; **Transportation**
  - `Amazon`, `Flipkart`, `Groceries`, `Mall` &rarr; **Shopping**
  - `Electricity`, `WiFi`, `Rent`, `Bill` &rarr; **Bills & Utilities**
  - `Netflix`, `Cinema`, `Movies`, `Games` &rarr; **Entertainment**
  - `Doctor`, `Medicine`, `Gym`, `Pharmacy` &rarr; **Health & Wellness**
- *Manual Override*: Click the detected badge anytime to customize the category if desired.

### 0️⃣ 2. Clean State (Starts at ₹0)
- The application begins strictly at **₹0 expenses** and 0 transactions.
- Spending totals, remaining balances, and budget utilization calculations begin only after you log your first transaction.

### 📧 3. Automated Weekly Email Reports
- **Real Delivery**: Dispatches via the active Formspree endpoint (`https://formspree.io/f/moejgbov`).
- **Sunday 12:00 AM Delivery**: Automated node-cron heartbeat scheduler checks your preferred timezone every Sunday morning.
- **Duplicate Prevention Guard**: Marks reporting periods to guarantee you never receive duplicate emails for the same week.
- **Strict Minimal Layout**:
  ```text
  date         amount      spent on                 category
  ----------------------------------------------------------------------
  2026-10-22   ₹40         Tea and snacks           Food & Drinks

  total spent: ₹40
  balance: ₹1,960
  ```
  *(Nothing extra: no greetings, category pie charts, or comparison cards cluttering the message).*

### 🎯 4. Budget Management & Threshold Warnings
- Set distinct **Weekly** and **Monthly** budgets, plus category-specific limits.
- Instant **Change Weekly Budget** modal accessible directly from the Dashboard and Weekly Reports.
- Automated color-coded warning banners:
  - 🟡 **50% Spent**: Halfway alert
  - 🟠 **75% Spent**: Caution alert
  - 🔴 **90% Spent**: Critical warning
  - 🚨 **100%+ Spent**: Over-budget alarm

### 📊 5. Comprehensive Analytics & Statement Exports
- **Interactive Charts**: Daily, weekly, monthly, and yearly breakdowns using Chart.js.
- **Transaction History**: Filter by type, category, date, or text search, with instant editing and deletion.
- **CSV & Styled PDF Reports**: One-click statement downloads with custom date ranges.
- **Income & Savings Goals**: Track multiple income streams and manage savings goals with progress meters.
- **Calendar View**: Visual month calendar with colored activity dots to inspect spending on specific dates.
- **Dark & Light Mode**: Built-in responsive theme toggle with persistent user preference.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Chart.js, Vite |
| **Backend** | Node.js, Express 4, node-cron, CORS, dotenv |
| **Email & Form Delivery** | Formspree (`https://formspree.io/f/moejgbov`), Resend API integration |
| **Storage** | Local Persistent Storage (`server/data/store.json`) + Optional Supabase (PostgreSQL + RLS) |
| **Testing** | Node.js Test Automation Suite (`scripts/test-verification.mjs`) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ installed on your system.
- **npm** or **yarn**.

### 2. Clone the Repository
```bash
git clone https://github.com/jayadhanush871/expense_tracker.git
cd expense_tracker
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Your `.env` contains:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Active Formspree Endpoint for Form Storage & Weekly Email Delivery
FORMSPREE_URL=https://formspree.io/f/moejgbov

# Optional: Resend SMTP API Key (https://resend.com)
RESEND_API_KEY=
SENDER_EMAIL=Expense Tracker <onboarding@resend.dev>

# Secret token for protected scheduler endpoints
CRON_SECRET=expense_tracker_secure_token_2026

# Optional: Supabase PostgreSQL Cloud DB (Local persistent file store used when blank)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

> [!NOTE]
> **Zero Setup Out-of-the-Box**: If Supabase or Resend credentials are not configured, the app immediately uses the built-in local JSON file store (`server/data/store.json`) and the Formspree endpoint. Everything works immediately!

### 5. Start the Application
Run both the Express backend API and Vite frontend server with a single command:
```bash
npm run dev
```

- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)

---

## 🧪 Automated Verification Suite

Run the comprehensive test suite verifying all 44 test assertions across profile creation, quick-add expenses, auto category detection, zero-start state, weekly calculation, minimal email formatting, and duplicate prevention:

```bash
node scripts/test-verification.mjs
```

**Result:** `44 PASSED, 0 FAILED`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
