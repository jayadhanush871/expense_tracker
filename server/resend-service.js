import { Resend } from 'resend';
import { db } from './db.js';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.startsWith('re_')) {
    return null;
  }
  return new Resend(apiKey);
}

// Format currency
export function formatINR(val) {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// Calculate comprehensive weekly metrics
export async function calculateWeeklyFinancialSummary(userEmail, endDateStr = null) {
  const profile = await db.getProfile();
  const userName = profile?.full_name || 'User';
  const recipientEmail = userEmail || profile?.email || 'user@example.com';

  const expenses = await db.getExpenses(recipientEmail);
  const incomes = await db.getIncomes(recipientEmail);
  const budgets = await db.getBudgets(recipientEmail);

  // Define 7-day reporting window
  const endDate = endDateStr ? new Date(endDateStr) : new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);

  // Previous 7-day window for comparison
  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(startDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevEndDate.getDate() - 6);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  const prevStartStr = prevStartDate.toISOString().split('T')[0];
  const prevEndStr = prevEndDate.toISOString().split('T')[0];

  const periodKey = `${startStr}_to_${endStr}`;

  // Filter current period transactions
  const currentExpenses = expenses.filter(e => e.date >= startStr && e.date <= endStr);
  const currentIncomes = incomes.filter(i => i.date >= startStr && i.date <= endStr);

  // Filter previous period transactions
  const prevExpenses = expenses.filter(e => e.date >= prevStartStr && e.date <= prevEndStr);

  const totalExpenses = currentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalIncome = currentIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const netCashFlow = totalIncome - totalExpenses;
  const prevTotalExpenses = prevExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Weekly budget calculations
  const weeklyBudget = budgets.weekly_budget !== null && budgets.weekly_budget !== undefined ? Number(budgets.weekly_budget) : null;
  const isBudgetSet = weeklyBudget !== null;
  const remainingBudget = isBudgetSet ? weeklyBudget - totalExpenses : null;
  const budgetUtilizedPct = isBudgetSet && weeklyBudget > 0 ? (totalExpenses / weeklyBudget) * 100 : 0;

  // Highest expense
  let highestExpense = null;
  if (currentExpenses.length > 0) {
    highestExpense = currentExpenses.reduce((max, e) => (Number(e.amount) > Number(max.amount) ? e : max), currentExpenses[0]);
  }

  // Daily average spending over 7 days
  const averageDailySpending = totalExpenses / 7;

  // Daily spending breakdown (all 7 days)
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dailyBreakdown = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dStr = d.toISOString().split('T')[0];
    const dayName = daysOfWeek[d.getDay()];
    const dayTotal = currentExpenses
      .filter(e => e.date === dStr)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    dailyBreakdown.push({
      date: dStr,
      day: dayName,
      shortDay: dayName.slice(0, 3),
      total: dayTotal
    });
  }

  // Category breakdown
  const categoryMap = {};
  currentExpenses.forEach(e => {
    const cat = e.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + Number(e.amount);
  });

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // Comparison with previous week
  let spendingChangePct = 0;
  let spendingDifference = totalExpenses - prevTotalExpenses;
  if (prevTotalExpenses > 0) {
    spendingChangePct = ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100;
  } else if (totalExpenses > 0) {
    spendingChangePct = 100;
  }

  // Factual spending summary
  let factualSummary = '';
  if (currentExpenses.length === 0) {
    factualSummary = `You recorded zero expenses (₹0) across 0 transactions during this week. Your weekly budget remains completely untouched.`;
  } else {
    const highestDetail = highestExpense ? `Your single highest expense was ${formatINR(highestExpense.amount)} for "${highestExpense.description}" (${highestExpense.category}).` : '';
    const budgetSentence = isBudgetSet
      ? `You have utilized ${budgetUtilizedPct.toFixed(1)}% of your ${formatINR(weeklyBudget)} weekly budget, with ${formatINR(Math.max(0, remainingBudget))} remaining.`
      : 'No weekly budget is configured yet.';

    const comparisonText = prevTotalExpenses > 0
      ? `Compared to the previous week (${formatINR(prevTotalExpenses)}), your spending ${spendingChangePct > 0 ? 'increased by ' + Math.abs(spendingChangePct).toFixed(1) + '%' : 'decreased by ' + Math.abs(spendingChangePct).toFixed(1) + '%'}.`
      : 'No expenses were recorded in the preceding week for comparison.';

    factualSummary = `You spent a total of ${formatINR(totalExpenses)} across ${currentExpenses.length} transaction${currentExpenses.length === 1 ? '' : 's'} this week (averaging ${formatINR(averageDailySpending)} per day). ${highestDetail} ${budgetSentence} ${comparisonText}`;
  }

  return {
    userName,
    recipientEmail,
    periodStart: startStr,
    periodEnd: endStr,
    periodKey,
    totalExpenses,
    totalIncome,
    netCashFlow,
    weeklyBudget,
    isBudgetSet,
    remainingBudget,
    budgetUtilizedPct,
    transactionCount: currentExpenses.length,
    highestExpense,
    averageDailySpending,
    dailyBreakdown,
    categoryBreakdown,
    prevTotalExpenses,
    spendingDifference,
    spendingChangePct,
    factualSummary,
    expenses: currentExpenses
  };
}

// Generate responsive HTML email
export function generateEmailHtml(summary) {
  const {
    expenses = [],
    totalExpenses = 0,
    isBudgetSet,
    remainingBudget,
    netCashFlow
  } = summary;

  const balance = isBudgetSet
    ? formatINR(remainingBudget)
    : formatINR(netCashFlow || 0);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Weekly Expense Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
    th { text-align: left; padding: 10px 12px; background: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .amount { font-weight: 700; color: #0f172a; }
    .summary-box { border-top: 2px solid #e2e8f0; padding-top: 16px; margin-top: 8px; font-size: 15px; }
    .summary-line { margin: 8px 0; font-size: 15px; color: #0f172a; }
  </style>
</head>
<body>
  <div class="card">
    <table>
      <thead>
        <tr>
          <th>date</th>
          <th>amount</th>
          <th>spent on</th>
          <th>category</th>
        </tr>
      </thead>
      <tbody>
        ${expenses && expenses.length > 0 ? expenses.map(e => `
          <tr>
            <td>${e.date || ''}</td>
            <td class="amount">${formatINR(e.amount)}</td>
            <td>${e.description || ''}</td>
            <td>${e.category || 'Other'}</td>
          </tr>
        `).join('') : `
          <tr>
            <td colspan="4" style="text-align: center; color: #94a3b8; padding: 16px;">No expenses recorded</td>
          </tr>
        `}
      </tbody>
    </table>

    <div class="summary-box">
      <div class="summary-line"><strong>total spent:</strong> ${formatINR(totalExpenses)}</div>
      <div class="summary-line"><strong>balance:</strong> ${balance}</div>
    </div>
  </div>
</body>
</html>
  `;
}

// Generate Plain Text Version
export function generateEmailText(summary) {
  const { expenses = [], totalExpenses = 0, isBudgetSet, remainingBudget, netCashFlow } = summary;
  const balance = isBudgetSet ? formatINR(remainingBudget) : formatINR(netCashFlow || 0);

  let tableRows = '';
  if (expenses && expenses.length > 0) {
    tableRows = expenses
      .map(e => `${(e.date || '').padEnd(12)} ${formatINR(e.amount).padEnd(12)} ${(e.description || '').padEnd(24)} ${e.category || 'Other'}`)
      .join('\n');
  } else {
    tableRows = 'No expenses recorded';
  }

  return [
    `date         amount      spent on                 category`,
    `----------------------------------------------------------------------`,
    tableRows,
    ``,
    `total spent: ${formatINR(totalExpenses)}`,
    `balance: ${balance}`
  ].join('\n');
}

// Formspree Integration for Form Data Storage & Email Delivery
// Sends ONLY: date, amount, spent on, category, followed by total spent and balance. Nothing extra.
export async function sendViaFormspree(summary, targetEmail) {
  const formspreeUrl = process.env.FORMSPREE_URL || 'https://formspree.io/f/moejgbov';

  const balance = summary.isBudgetSet
    ? formatINR(summary.remainingBudget)
    : formatINR(summary.netCashFlow || 0);

  let tableRows = '';
  if (summary.expenses && summary.expenses.length > 0) {
    tableRows = summary.expenses
      .map(e => `${(e.date || '').padEnd(12)} ${formatINR(e.amount).padEnd(12)} ${(e.description || '').padEnd(24)} ${e.category || 'Other'}`)
      .join('\n');
  } else {
    tableRows = 'No expenses recorded';
  }

  const messageText = [
    `date         amount      spent on                 category`,
    `----------------------------------------------------------------------`,
    tableRows,
    ``,
    `total spent: ${formatINR(summary.totalExpenses)}`,
    `balance: ${balance}`
  ].join('\n');

  const payload = {
    email: targetEmail || summary.recipientEmail,
    _replyto: targetEmail || summary.recipientEmail,
    _subject: `Weekly Expense Report`,
    date_amount_spent_on_category: tableRows,
    total_spent: formatINR(summary.totalExpenses),
    balance: balance,
    message: messageText
  };

  const response = await fetch(formspreeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Formspree submission failed (HTTP ${response.status})`);
  }

  const data = await response.json();
  return { success: true, service: 'Formspree', data, payload };
}

// Dispatch report via Formspree & Resend with duplicate check & audit logging
export async function sendWeeklyReportEmail({ force = false, targetEmail = null } = {}) {
  const profile = await db.getProfile();
  const userEmail = targetEmail || profile?.email;

  if (!userEmail) {
    throw new Error('No user email configured. Please set your email address in your profile.');
  }

  const summary = await calculateWeeklyFinancialSummary(userEmail);
  const reportSettings = await db.getReportSettings(userEmail);

  // Check duplicate report for the same reporting period
  if (!force && reportSettings.last_sent_period === summary.periodKey) {
    return {
      success: true,
      skipped: true,
      message: `Weekly report for period ${summary.periodKey} was already sent previously. Skipped to prevent duplicate emails.`,
      periodKey: summary.periodKey
    };
  }

  try {
    // 1. Deliver and store via Formspree
    const formspreeResult = await sendViaFormspree(summary, userEmail);

    // 2. Also send via Resend if credentials are configured
    const resend = getResendClient();
    if (resend) {
      try {
        const sender = process.env.SENDER_EMAIL || 'Expense Tracker <onboarding@resend.dev>';
        const subject = `Your Weekly Expense and Budget Report (${summary.periodStart} - ${summary.periodEnd})`;
        const html = generateEmailHtml(summary);
        const text = generateEmailText(summary);

        await resend.emails.send({
          from: sender,
          to: [userEmail],
          subject: subject,
          html: html,
          text: text
        });
      } catch (resendErr) {
        console.warn('Optional Resend delivery notice (Formspree succeeded):', resendErr.message);
      }
    }

    // Update last_sent_period in settings to prevent duplicates
    await db.saveReportSettings(userEmail, {
      ...reportSettings,
      last_sent_period: summary.periodKey
    });

    // Record audit log
    await db.addEmailLog({
      user_email: userEmail,
      recipient: userEmail,
      period_start: summary.periodStart,
      period_end: summary.periodEnd,
      status: 'SUCCESS',
      total_expense: summary.totalExpenses,
      total_income: summary.totalIncome,
      transactions_count: summary.transactionCount,
      error_message: null
    });

    return {
      success: true,
      service: 'Formspree',
      recipient: userEmail,
      periodKey: summary.periodKey,
      summary
    };
  } catch (err) {
    console.error('Failed to send weekly report email:', err.message);

    // Record failure in audit log
    await db.addEmailLog({
      user_email: userEmail,
      recipient: userEmail,
      period_start: summary.periodStart,
      period_end: summary.periodEnd,
      status: 'FAILED',
      total_expense: summary.totalExpenses,
      total_income: summary.totalIncome,
      transactions_count: summary.transactionCount,
      error_message: err.message
    });

    return {
      success: false,
      error: err.message,
      summary
    };
  }
}

// Send instant test verification email via Formspree
export async function sendTestVerificationEmail(targetEmail) {
  const profile = await db.getProfile();
  const recipient = targetEmail || profile?.email || 'user@example.com';
  const name = profile?.full_name || 'User';
  const formspreeUrl = process.env.FORMSPREE_URL || 'https://formspree.io/f/moejgbov';

  try {
    const payload = {
      form_type: 'Email Delivery Test',
      user_name: name,
      recipient_email: recipient,
      email: recipient,
      _replyto: recipient,
      _subject: 'Expense Tracker - Email Verification Test',
      message: `Hello ${name}, this test confirms that Formspree email delivery and form data storage (${formspreeUrl}) is functioning properly!`,
      timestamp: new Date().toISOString()
    };

    const res = await fetch(formspreeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Formspree test submission failed with HTTP status ${res.status}`);
    }

    return {
      success: true,
      service: 'Formspree',
      recipient,
      message: `Verification test email dispatched to ${recipient} via Formspree!`
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

