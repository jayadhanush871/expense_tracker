import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import {
  calculateWeeklyFinancialSummary,
  sendWeeklyReportEmail,
  sendTestVerificationEmail
} from './resend-service.js';
import { initScheduler, getSchedulerStatus } from './scheduler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const CRON_SECRET = process.env.CRON_SECRET || 'expense_tracker_secure_token_2026';

app.use(cors());
app.use(express.json());

// Category auto-detection keyword mapping
const CATEGORY_KEYWORDS = {
  'Food & Drinks': [
    'tea', 'coffee', 'chai', 'snack', 'snacks', 'lunch', 'dinner', 'breakfast',
    'pizza', 'burger', 'food', 'restaurant', 'cafe', 'swiggy', 'zomato',
    'mcdonalds', 'kfc', 'starbucks', 'biryani', 'bread', 'milk', 'egg', 'fruits',
    'vegetables', 'juice', 'beer', 'drinks', 'water', 'biscuit', 'cookies', 'bakery'
  ],
  'Transportation': [
    'uber', 'ola', 'rapido', 'auto', 'cab', 'taxi', 'metro', 'bus', 'train',
    'fuel', 'petrol', 'diesel', 'toll', 'flight', 'ticket', 'parking', 'railway', 'irctc'
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'shirt', 'pants', 'tshirt',
    'grocery', 'groceries', 'supermarket', 'mall', 'electronics', 'books', 'watch', 'bag'
  ],
  'Bills & Utilities': [
    'electricity', 'power', 'water bill', 'wifi', 'internet', 'broadband',
    'recharge', 'mobile bill', 'airtel', 'jio', 'rent', 'gas', 'lpg', 'maintenance'
  ],
  'Entertainment': [
    'movie', 'movies', 'cinema', 'theatre', 'netflix', 'prime', 'spotify',
    'hotstar', 'game', 'gaming', 'concert', 'party', 'outing', 'club'
  ],
  'Health & Wellness': [
    'doctor', 'hospital', 'medicine', 'pharmacy', 'clinic', 'dentist', 'gym',
    'fitness', 'supplement', 'therapy', 'medical', 'test', 'blood test'
  ],
  'Education': [
    'course', 'tuition', 'fee', 'books', 'school', 'college', 'udemy', 'coursera', 'exam'
  ]
};

export function detectCategory(description) {
  if (!description) return 'Other';
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      // Word boundary match or substring
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(lower) || lower.includes(kw)) {
        return category;
      }
    }
  }
  return 'Other';
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Status Check
app.get('/api/status', (req, res) => {
  const dbStatus = db.getStatus();
  const schedulerStatus = getSchedulerStatus();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    ...dbStatus,
    scheduler: schedulerStatus
  });
});

// 2. Profile Management (Simple Profile: Full Name and Email Address only)
app.get('/api/profile', async (req, res) => {
  try {
    const profile = await db.getProfile();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile', async (req, res) => {
  try {
    const { full_name, email } = req.body;

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required and cannot be blank.' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const saved = await db.saveProfile({
      full_name: full_name.trim(),
      email: email.trim()
    });

    // Sync profile submission to Formspree for cloud form storage and email notification
    try {
      const formspreeUrl = process.env.FORMSPREE_URL || 'https://formspree.io/f/moejgbov';
      fetch(formspreeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          form_type: 'Profile Setup',
          full_name: full_name.trim(),
          email: email.trim(),
          _replyto: email.trim(),
          _subject: `Profile Configured: ${full_name.trim()}`,
          message: `User ${full_name.trim()} configured their profile with email address ${email.trim()}.`
        })
      }).catch(err => console.warn('Formspree profile submission notice:', err.message));
    } catch (e) {}

    res.json({ success: true, profile: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const profile = await db.getProfile();
    const expenses = await db.getExpenses(profile?.email);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { amount, description, category, date, time } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid expense amount greater than 0.' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Please describe what you spent on.' });
    }

    const profile = await db.getProfile();
    const now = new Date();

    // Auto-detect category if not explicitly provided or if user asks for auto
    const finalCategory = category && category !== 'Auto' ? category : detectCategory(description);

    // Auto-capture date and time from system if omitted
    const finalDate = date || now.toISOString().split('T')[0];
    const finalTime = time || now.toTimeString().split(' ')[0];

    const newExpense = await db.addExpense({
      user_email: profile?.email || 'user@example.com',
      amount: numAmount,
      description: description.trim(),
      category: finalCategory,
      date: finalDate,
      time: finalTime
    });

    res.status(201).json(newExpense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, category, date, time } = req.body;
    const updates = {};
    if (amount !== undefined) updates.amount = Number(amount);
    if (description !== undefined) updates.description = description.trim();
    if (category !== undefined) updates.category = category;
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;

    const updated = await db.updateExpense(id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteExpense(id);
    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Incomes
app.get('/api/incomes', async (req, res) => {
  try {
    const profile = await db.getProfile();
    const incomes = await db.getIncomes(profile?.email);
    res.json(incomes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/incomes', async (req, res) => {
  try {
    const { amount, source, category, date } = req.body;
    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid income amount greater than 0.' });
    }

    if (!source || !source.trim()) {
      return res.status(400).json({ error: 'Please enter an income source description.' });
    }

    const profile = await db.getProfile();
    const newIncome = await db.addIncome({
      user_email: profile?.email || 'user@example.com',
      amount: numAmount,
      source: source.trim(),
      category: category || 'Salary',
      date: date || new Date().toISOString().split('T')[0]
    });

    res.status(201).json(newIncome);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/incomes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, source, category, date } = req.body;
    const updates = {};
    if (amount !== undefined) updates.amount = Number(amount);
    if (source !== undefined) updates.source = source.trim();
    if (category !== undefined) updates.category = category;
    if (date !== undefined) updates.date = date;

    const updated = await db.updateIncome(id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/incomes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteIncome(id);
    res.json({ success: true, message: 'Income deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Budgets
app.get('/api/budgets', async (req, res) => {
  try {
    const profile = await db.getProfile();
    const budgets = await db.getBudgets(profile?.email);
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/budgets', async (req, res) => {
  try {
    const profile = await db.getProfile();
    const { weekly_budget, monthly_budget, category_budgets } = req.body;

    const saved = await db.saveBudgets(profile?.email || 'user@example.com', {
      weekly_budget: weekly_budget === '' || weekly_budget === null ? null : Number(weekly_budget),
      monthly_budget: monthly_budget === '' || monthly_budget === null ? null : Number(monthly_budget),
      category_budgets: category_budgets || {}
    });

    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Savings Goals
app.get('/api/goals', async (req, res) => {
  try {
    const profile = await db.getProfile();
    const goals = await db.getSavingsGoals(profile?.email);
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/goals', async (req, res) => {
  try {
    const { title, target_amount, saved_amount, target_date } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Goal title is required.' });
    }
    const numTarget = Number(target_amount);
    if (!numTarget || numTarget <= 0) {
      return res.status(400).json({ error: 'Target amount must be greater than 0.' });
    }

    const profile = await db.getProfile();
    const newGoal = await db.addSavingsGoal({
      user_email: profile?.email || 'user@example.com',
      title: title.trim(),
      target_amount: numTarget,
      saved_amount: Number(saved_amount || 0),
      target_date: target_date || null
    });

    res.status(201).json(newGoal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, target_amount, saved_amount, target_date } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (target_amount !== undefined) updates.target_amount = Number(target_amount);
    if (saved_amount !== undefined) updates.saved_amount = Number(saved_amount);
    if (target_date !== undefined) updates.target_date = target_date;

    const updated = await db.updateSavingsGoal(id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteSavingsGoal(id);
    res.json({ success: true, message: 'Savings goal deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Weekly Report Settings
app.get('/api/reports/settings', async (req, res) => {
  try {
    const profile = await db.getProfile();
    const settings = await db.getReportSettings(profile?.email);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/settings', async (req, res) => {
  try {
    const profile = await db.getProfile();
    const { is_active, delivery_day, delivery_time, timezone } = req.body;
    const updated = await db.saveReportSettings(profile?.email || 'user@example.com', {
      is_active,
      delivery_day,
      delivery_time,
      timezone
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Weekly Report Summary (Real-time calculation from saved transactions)
app.get('/api/reports/weekly-summary', async (req, res) => {
  try {
    const profile = await db.getProfile();
    const summary = await calculateWeeklyFinancialSummary(profile?.email);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Send Weekly Report (Protected endpoint: supports cron / webhook & manual UI trigger)
app.post('/api/reports/send-weekly', async (req, res) => {
  try {
    // Check authorization token if external caller or header provided
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token !== CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized: Invalid CRON_SECRET token.' });
      }
    }

    const { force, email } = req.body || {};
    const result = await sendWeeklyReportEmail({ force: Boolean(force), targetEmail: email });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Send Test Verification Email
app.post('/api/reports/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await sendTestVerificationEmail(email);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Delivery Logs
app.get('/api/reports/logs', async (req, res) => {
  try {
    const profile = await db.getProfile();
    const logs = await db.getEmailLogs(profile?.email);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Retry Email
app.post('/api/reports/retry/:id', async (req, res) => {
  try {
    const profile = await db.getProfile();
    // Dispatch report with force=true to re-send
    const result = await sendWeeklyReportEmail({ force: true, targetEmail: profile?.email });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// In production, serve static client assets
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexHtml = path.join(distPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('Expense Tracker API Server is running. In dev mode, please access the frontend at http://localhost:3000');
    }
  });
});

// Start server if run directly
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('server'));
if (isDirectRun || process.env.RUN_SERVER === 'true') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 EXPENSE TRACKER BACKEND RUNNING ON PORT ${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api`);
    console.log(`======================================================`);

    // Start internal background scheduler
    initScheduler();
  });
}
