import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/db.js';
import {
  calculateWeeklyFinancialSummary,
  sendWeeklyReportEmail,
  sendTestVerificationEmail,
  sendViaFormspree,
  generateEmailHtml,
  generateEmailText
} from '../server/resend-service.js';
import { detectCategory } from '../server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('🧪 RUNNING COMPREHENSIVE EXPENSE TRACKER VERIFICATION');
console.log('====================================================\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // TEST 0: Confirm Initial Zero State
    console.log('--- TEST SUITE 0: INITIAL ZERO EXPENSES STATE ---');
    const initialExpenses = await db.getExpenses('newuser@example.com');
    const initialSummary = await calculateWeeklyFinancialSummary('newuser@example.com');
    assert(initialExpenses.length === 0, 'Starting expenses list is 0 records');
    assert(initialSummary.totalExpenses === 0, 'Starting total expenses is ₹0');
    assert(initialSummary.transactionCount === 0, 'Starting transaction count is 0');
    assert(initialSummary.factualSummary.includes('zero expenses'), 'Summary correctly states zero expenses recorded');

    // TEST 1: Profile Creation with ONLY Full Name and Email Address
    console.log('\n--- TEST SUITE 1: SIMPLE PROFILE CREATION ---');
    const profileData = {
      full_name: 'Dhanush',
      email: 'dhanush@example.com'
    };
    const savedProfile = await db.saveProfile(profileData);
    assert(savedProfile.full_name === 'Dhanush', 'Profile full_name saved correctly as Dhanush');
    assert(savedProfile.email === 'dhanush@example.com', 'Profile email saved correctly as dhanush@example.com');
    assert(savedProfile.updated_at !== undefined, 'Profile timestamp recorded');

    // TEST 2: Add Expense (₹40 for "Tea and snacks") with Auto Date/Time & Category Detection
    console.log('\n--- TEST SUITE 2: QUICK-ADD EXPENSE & AUTO CATEGORY ---');
    const detectedCat = detectCategory('Tea and snacks');
    assert(detectedCat === 'Food & Drinks', `Category for "Tea and snacks" auto-detected as Food & Drinks (got: ${detectedCat})`);

    const now = new Date();
    const autoDate = now.toISOString().split('T')[0];
    const autoTime = now.toTimeString().split(' ')[0];

    const expense = await db.addExpense({
      user_email: 'dhanush@example.com',
      amount: 40,
      description: 'Tea and snacks',
      category: detectedCat,
      date: autoDate,
      time: autoTime
    });

    assert(expense.amount === 40, 'Expense amount is ₹40');
    assert(expense.description === 'Tea and snacks', 'Description is "Tea and snacks"');
    assert(expense.category === 'Food & Drinks', 'Category assigned as Food & Drinks');
    assert(expense.date === autoDate, `System automatically captured date: ${expense.date}`);
    assert(expense.time !== undefined && expense.time.length > 0, `System automatically captured time: ${expense.time}`);

    // TEST 3: Confirm Persistent Storage and Started Calculations
    console.log('\n--- TEST SUITE 3: CALCULATIONS BEGAN AFTER ADDING EXPENSE ---');
    const allExpenses = await db.getExpenses('dhanush@example.com');
    const found = allExpenses.find(e => e.id === expense.id);
    assert(found !== undefined, 'Expense found in database store');
    assert(found.amount === 40, 'Persisted amount is exactly ₹40');
    assert(allExpenses.length >= 1, `Calculations active: ${allExpenses.length} expense(s) tracked`);

    // TEST 4: Budget Settings (Weekly, Monthly, Category)
    console.log('\n--- TEST SUITE 4: BUDGET SETTINGS & THRESHOLDS ---');
    const savedBudgets = await db.saveBudgets('dhanush@example.com', {
      weekly_budget: 2000,
      monthly_budget: 15000,
      category_budgets: {
        'Food & Drinks': 4000,
        'Transportation': 2000
      }
    });

    assert(savedBudgets.weekly_budget === 2000, 'Weekly budget set to ₹2,000');
    assert(savedBudgets.monthly_budget === 15000, 'Monthly budget set to ₹15,000');

    // TEST 4B: Change Weekly Budget (Custom amount, not 2000)
    console.log('\n--- TEST SUITE 4B: CHANGE WEEKLY BUDGET TO CUSTOM VALUE ---');
    const changedBudgets = await db.saveBudgets('dhanush@example.com', {
      weekly_budget: 3500,
      monthly_budget: 15000,
      category_budgets: { 'Food & Drinks': 4000 }
    });
    assert(changedBudgets.weekly_budget === 3500, 'Weekly budget changed successfully to ₹3,500 (not stuck at 2000)');

    // Reset back to 2000 for Suite 5 comparison
    await db.saveBudgets('dhanush@example.com', {
      weekly_budget: 2000,
      monthly_budget: 15000,
      category_budgets: { 'Food & Drinks': 4000 }
    });

    // TEST 4C: PhonePe and Cash Category Separation
    console.log('\n--- TEST SUITE 4C: PHONEPE & CASH CATEGORIES SEPARATION ---');
    assert(detectCategory('Grocery paid via PhonePe') === 'PhonePe', 'Auto-detects PhonePe category from description');
    assert(detectCategory('Paid auto fare in Cash') === 'Cash', 'Auto-detects Cash category from description');

    // Add PhonePe & Cash expenses
    const expPhonePe = await db.addExpense({
      user_email: 'dhanush@example.com',
      amount: 120,
      description: 'Supermarket shopping',
      category: 'PhonePe',
      date: '2026-10-22',
      time: '14:00:00'
    });
    const expCash = await db.addExpense({
      user_email: 'dhanush@example.com',
      amount: 60,
      description: 'Street vegetable cart',
      category: 'Cash',
      date: '2026-10-22',
      time: '14:30:00'
    });

    // Add PhonePe & Cash incomes
    const incPhonePe = await db.addIncome({
      user_email: 'dhanush@example.com',
      amount: 5000,
      source: 'Freelance UPI Credit',
      category: 'PhonePe',
      date: '2026-10-22'
    });
    const incCash = await db.addIncome({
      user_email: 'dhanush@example.com',
      amount: 1000,
      source: 'Cash from ATM / Friend',
      category: 'Cash',
      date: '2026-10-22'
    });

    // Verify separate calculations
    const allExp = await db.getExpenses('dhanush@example.com');
    const allInc = await db.getIncomes('dhanush@example.com');

    const pExp = allExp.filter(e => e.category.toLowerCase().includes('phonepe')).reduce((s, e) => s + Number(e.amount), 0);
    const pInc = allInc.filter(i => i.category.toLowerCase().includes('phonepe')).reduce((s, i) => s + Number(i.amount), 0);
    const pBal = pInc - pExp;

    const cExp = allExp.filter(e => e.category.toLowerCase().includes('cash')).reduce((s, e) => s + Number(e.amount), 0);
    const cInc = allInc.filter(i => i.category.toLowerCase().includes('cash')).reduce((s, i) => s + Number(i.amount), 0);
    const cBal = cInc - cExp;

    assert(pExp === 120, `PhonePe expenses tracked separately: ₹${pExp}`);
    assert(pInc === 5000, `PhonePe incomes tracked separately: ₹${pInc}`);
    assert(pBal === 4880, `PhonePe balance tracked separately: ₹${pBal}`);

    assert(cExp === 60, `Cash expenses tracked separately: ₹${cExp}`);
    assert(cInc === 1000, `Cash incomes tracked separately: ₹${cInc}`);
    assert(cBal === 940, `Cash balance tracked separately: ₹${cBal}`);

    // TEST 5: Generate Weekly Report from Saved Database Records
    console.log('\n--- TEST SUITE 5: WEEKLY FINANCIAL REPORT CALCULATION ---');
    const summary = await calculateWeeklyFinancialSummary('dhanush@example.com');

    assert(summary.userName === 'Dhanush', `User greeting uses saved name: ${summary.userName}`);
    assert(summary.recipientEmail === 'dhanush@example.com', `Recipient matches profile email: ${summary.recipientEmail}`);
    assert(summary.totalExpenses >= 40, `Total weekly expenses includes ₹40 (Actual: ₹${summary.totalExpenses})`);
    assert(summary.weeklyBudget === 2000, 'Weekly budget correctly reported as ₹2,000');
    assert(summary.remainingBudget === 2000 - summary.totalExpenses, `Remaining budget correctly calculated: ₹${summary.remainingBudget}`);
    assert(summary.budgetUtilizedPct === (summary.totalExpenses / 2000) * 100, `Budget utilization % correctly calculated: ${summary.budgetUtilizedPct.toFixed(1)}%`);
    assert(summary.transactionCount >= 1, `Transactions count accurate: ${summary.transactionCount}`);
    assert(summary.dailyBreakdown.length === 7, 'Daily breakdown contains all 7 days of the week');
    assert(summary.factualSummary.length > 0, `Factual spending overview generated: "${summary.factualSummary}"`);

    // TEST 6: HTML & Plain-Text Email Generation (Strict Minimal Format)
    console.log('\n--- TEST SUITE 6: EMAIL CONTENT & FORMATTING ---');
    const htmlEmail = generateEmailHtml(summary);
    const textEmail = generateEmailText(summary);

    assert(htmlEmail.includes('<th>date</th>') && htmlEmail.includes('<th>amount</th>') && htmlEmail.includes('<th>spent on</th>') && htmlEmail.includes('<th>category</th>'), 'HTML Email includes exact table headers: date, amount, spent on, category');
    assert(htmlEmail.includes('total spent:'), 'HTML Email includes total spent:');
    assert(htmlEmail.includes('balance:'), 'HTML Email includes balance:');
    assert(!htmlEmail.includes('Hello Dhanush'), 'HTML Email omits extraneous greetings as requested');
    assert(!htmlEmail.includes('Category Breakdown'), 'HTML Email omits extraneous category breakdown chart');
    assert(textEmail.includes('date') && textEmail.includes('amount') && textEmail.includes('spent on') && textEmail.includes('category'), 'Plain-text Email includes table headers');
    assert(textEmail.includes('total spent:'), 'Plain-text Email includes total spent:');
    assert(textEmail.includes('balance:'), 'Plain-text Email includes balance:');

    // TEST 7: Formspree Real Email Delivery to https://formspree.io/f/moejgbov
    console.log('\n--- TEST SUITE 7: FORMSPREE REAL EMAIL DELIVERY & FORM STORAGE ---');
    const formspreeDelivery = await sendViaFormspree(summary, 'dhanush@example.com');
    assert(formspreeDelivery.success === true, 'Formspree accepted report submission and queued real email delivery');
    assert(formspreeDelivery.service === 'Formspree', 'Service confirmed as Formspree (https://formspree.io/f/moejgbov)');

    // TEST 8: Duplicate Prevention & Scheduled Dispatch
    console.log('\n--- TEST SUITE 8: DUPLICATE PREVENTION & AUDIT LOGGING ---');
    const defaultSettings = await db.getReportSettings('dhanush@example.com');
    assert(defaultSettings.delivery_day === 'Sunday', 'Default scheduled delivery day is Sunday');
    assert(defaultSettings.delivery_time === '00:00', 'Default scheduled delivery time is 00:00 (12:00 AM midnight)');

    await db.saveReportSettings('dhanush@example.com', {
      is_active: true,
      delivery_day: 'Sunday',
      delivery_time: '00:00',
      timezone: 'Asia/Kolkata',
      last_sent_period: summary.periodKey // simulate already sent
    });

    const duplicateCheck = await sendWeeklyReportEmail({ force: false, targetEmail: 'dhanush@example.com' });
    assert(duplicateCheck.skipped === true, 'Duplicate report for the same period was successfully skipped');

    // Reset last_sent_period to test send with force
    await db.saveReportSettings('dhanush@example.com', {
      is_active: true,
      delivery_day: 'Sunday',
      delivery_time: '00:00',
      timezone: 'Asia/Kolkata',
      last_sent_period: null
    });

    const sendAttempt = await sendWeeklyReportEmail({ force: true, targetEmail: 'dhanush@example.com' });
    assert(sendAttempt.success === true, 'sendWeeklyReportEmail dispatched report successfully via Formspree');

    // Verify Audit Logs
    const logs = await db.getEmailLogs('dhanush@example.com');
    assert(logs.length > 0, `Delivery attempt audit log recorded in database (Total logs: ${logs.length})`);
    assert(logs[0].recipient === 'dhanush@example.com', `Logged recipient is dhanush@example.com`);

    // Reset only test transactions and logs so expenses start at 0, while keeping profile & budget
    const storeP = path.join(__dirname, '..', 'server', 'data', 'store.json');
    const existingStore = fs.existsSync(storeP) ? JSON.parse(fs.readFileSync(storeP, 'utf-8')) : {};
    const cleanStore = {
      profile: existingStore.profile?.email ? existingStore.profile : { full_name: '', email: '', updated_at: new Date().toISOString() },
      expenses: [],
      incomes: [],
      budgets: existingStore.budgets || {
        weekly_budget: null,
        monthly_budget: null,
        category_budgets: {},
        updated_at: new Date().toISOString()
      },
      savings_goals: [],
      report_settings: {
        is_active: true,
        delivery_day: 'Sunday',
        delivery_time: '00:00',
        timezone: 'Asia/Kolkata',
        last_sent_period: null,
        updated_at: new Date().toISOString()
      },
      email_logs: []
    };
    fs.writeFileSync(storeP, JSON.stringify(cleanStore, null, 2), 'utf-8');
    console.log('\n🧹 Database reset: transactions cleared (0 expenses), profile & budget preserved.');

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  }
}

runTests();
