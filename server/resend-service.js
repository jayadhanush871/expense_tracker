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
    factualSummary
  };
}

// Generate responsive HTML email
export function generateEmailHtml(summary) {
  const {
    userName,
    periodStart,
    periodEnd,
    totalExpenses,
    totalIncome,
    netCashFlow,
    weeklyBudget,
    isBudgetSet,
    remainingBudget,
    budgetUtilizedPct,
    transactionCount,
    highestExpense,
    averageDailySpending,
    dailyBreakdown,
    categoryBreakdown,
    prevTotalExpenses,
    spendingChangePct,
    factualSummary
  } = summary;

  const budgetColor = budgetUtilizedPct > 100 ? '#ef4444' : budgetUtilizedPct > 80 ? '#f59e0b' : '#10b981';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Expense and Budget Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 620px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 28px; text-align: left; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 700; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 28px; }
    .greeting { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
    .subtext { font-size: 14px; color: #64748b; margin-bottom: 24px; line-height: 1.5; }
    .summary-box { background: #f1f5f9; border-left: 4px solid #4f46e5; padding: 14px 18px; border-radius: 8px; font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 24px; }
    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .metric-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px; }
    .metric-value { font-size: 22px; font-weight: 700; color: #0f172a; }
    .metric-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 24px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
    th { text-align: left; padding: 8px 10px; background: #f8fafc; color: #475569; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
    td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .amount { font-family: 'Courier New', Courier, monospace; font-weight: 600; text-align: right; }
    .progress-bar-bg { background: #e2e8f0; border-radius: 999px; height: 8px; overflow: hidden; margin-top: 6px; }
    .progress-bar-fill { height: 100%; border-radius: 999px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 12px; color: #94a3b8; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-red { background: #fee2e2; color: #b91c1c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Financial Summary</h1>
      <p>Reporting Period: ${periodStart} to ${periodEnd}</p>
    </div>

    <div class="content">
      <div class="greeting">Hello ${userName},</div>
      <div class="subtext">Here is your automated weekly expense and budget report for the past 7 days.</div>

      <div class="summary-box">
        <strong>Factual Overview:</strong><br/>
        ${factualSummary}
      </div>

      <!-- KPI Metrics -->
      <table style="width: 100%; margin-bottom: 20px;">
        <tr>
          <td style="width: 50%; padding: 6px; border: none;">
            <div class="metric-card">
              <div class="metric-title">Total Weekly Expenses</div>
              <div class="metric-value" style="color: #4f46e5;">${formatINR(totalExpenses)}</div>
              <div class="metric-sub">${transactionCount} transaction${transactionCount === 1 ? '' : 's'} recorded</div>
            </div>
          </td>
          <td style="width: 50%; padding: 6px; border: none;">
            <div class="metric-card">
              <div class="metric-title">Weekly Budget</div>
              <div class="metric-value">${isBudgetSet ? formatINR(weeklyBudget) : 'Not Set'}</div>
              <div class="metric-sub">
                ${isBudgetSet ? `Remaining: <strong style="color: ${remainingBudget >= 0 ? '#10b981' : '#ef4444'}">${formatINR(remainingBudget)}</strong>` : 'Configure in Budget settings'}
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="width: 50%; padding: 6px; border: none;">
            <div class="metric-card">
              <div class="metric-title">Budget Utilized</div>
              <div class="metric-value" style="color: ${budgetColor};">${isBudgetSet ? budgetUtilizedPct.toFixed(1) + '%' : 'N/A'}</div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${Math.min(100, budgetUtilizedPct)}%; background: ${budgetColor};"></div>
              </div>
            </div>
          </td>
          <td style="width: 50%; padding: 6px; border: none;">
            <div class="metric-card">
              <div class="metric-title">Average Daily Spending</div>
              <div class="metric-value">${formatINR(averageDailySpending)}</div>
              <div class="metric-sub">Over 7 active days</div>
            </div>
          </td>
        </tr>
      </table>

      ${totalIncome > 0 ? `
      <!-- Cash flow summary if income recorded -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
        <table style="width: 100%; border: none; margin: 0;">
          <tr>
            <td style="border: none; padding: 4px;"><strong>Recorded Income:</strong> ${formatINR(totalIncome)}</td>
            <td style="border: none; padding: 4px;"><strong>Expenses:</strong> ${formatINR(totalExpenses)}</td>
            <td style="border: none; padding: 4px; text-align: right;"><strong>Net Cash Flow:</strong> <span style="color: ${netCashFlow >= 0 ? '#15803d' : '#b91c1c'}; font-weight: 700;">${formatINR(netCashFlow)}</span></td>
          </tr>
        </table>
      </div>
      ` : ''}

      <!-- Highest Expense Highlight -->
      ${highestExpense ? `
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
        <span style="font-size: 12px; font-weight: 600; color: #b45309; text-transform: uppercase;">Highest Expense This Week</span>
        <div style="font-size: 16px; font-weight: 700; color: #92400e; margin-top: 4px;">
          ${formatINR(highestExpense.amount)} &bull; ${highestExpense.description}
          <span style="font-size: 12px; font-weight: normal; color: #b45309;">(${highestExpense.category} on ${highestExpense.date})</span>
        </div>
      </div>
      ` : ''}

      <!-- Category Breakdown -->
      <div class="section-title">Category Breakdown</div>
      ${categoryBreakdown.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th style="text-align: right;">Amount</th>
            <th style="text-align: right;">Share</th>
          </tr>
        </thead>
        <tbody>
          ${categoryBreakdown.map(cat => `
            <tr>
              <td><strong>${cat.category}</strong></td>
              <td class="amount">${formatINR(cat.amount)}</td>
              <td style="text-align: right; color: #64748b;">${cat.percentage.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : `<p style="font-size: 13px; color: #94a3b8; font-style: italic;">No expenses recorded across categories.</p>`}

      <!-- Daily Spending Breakdown -->
      <div class="section-title">Daily Spending Breakdown</div>
      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Date</th>
            <th style="text-align: right;">Total Spent</th>
          </tr>
        </thead>
        <tbody>
          ${dailyBreakdown.map(day => `
            <tr>
              <td><strong>${day.day}</strong></td>
              <td style="color: #64748b;">${day.date}</td>
              <td class="amount">${formatINR(day.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Comparison with Previous Week -->
      <div class="section-title">Comparison With Previous Week</div>
      <table style="margin-bottom: 8px;">
        <tr>
          <td>Previous Week Spending:</td>
          <td class="amount">${formatINR(prevTotalExpenses)}</td>
        </tr>
        <tr>
          <td>This Week Spending:</td>
          <td class="amount">${formatINR(totalExpenses)}</td>
        </tr>
        <tr>
          <td>Change:</td>
          <td class="amount" style="color: ${spendingChangePct > 0 ? '#ef4444' : '#10b981'};">
            ${spendingChangePct > 0 ? '+' : ''}${spendingChangePct.toFixed(1)}% (${formatINR(Math.abs(totalExpenses - prevTotalExpenses))} ${spendingChangePct > 0 ? 'more' : 'less'})
          </td>
        </tr>
      </table>

    </div>

    <div class="footer">
      <p>This automated financial report was generated for <strong>${userName}</strong> (${summary.recipientEmail}).</p>
      <p>Personal Expense Tracker &bull; Secure Data Storage &bull; Resend Email Engine</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Generate Plain Text Version
export function generateEmailText(summary) {
  const {
    userName,
    periodStart,
    periodEnd,
    totalExpenses,
    totalIncome,
    netCashFlow,
    weeklyBudget,
    isBudgetSet,
    remainingBudget,
    budgetUtilizedPct,
    transactionCount,
    highestExpense,
    averageDailySpending,
    dailyBreakdown,
    categoryBreakdown,
    prevTotalExpenses,
    spendingChangePct,
    factualSummary
  } = summary;

  let text = `Subject: Your Weekly Expense and Budget Report\n\n`;
  text += `Hello ${userName},\n\n`;
  text += `Here is your weekly financial summary for ${periodStart} to ${periodEnd}.\n\n`;
  text += `Summary:\n${factualSummary}\n\n`;
  text += `Total weekly expenses: ${formatINR(totalExpenses)}\n`;
  if (isBudgetSet) {
    text += `Weekly budget: ${formatINR(weeklyBudget)}\n`;
    text += `Budget remaining: ${formatINR(remainingBudget)}\n`;
    text += `Budget utilized: ${budgetUtilizedPct.toFixed(1)}%\n`;
  } else {
    text += `Weekly budget: Not configured\n`;
  }
  text += `Number of transactions: ${transactionCount}\n`;
  text += `Average daily spending: ${formatINR(averageDailySpending)}\n`;
  if (totalIncome > 0) {
    text += `Total weekly income: ${formatINR(totalIncome)}\n`;
    text += `Net cash flow: ${formatINR(netCashFlow)}\n`;
  }
  if (highestExpense) {
    text += `Highest expense: ${formatINR(highestExpense.amount)} (${highestExpense.description} - ${highestExpense.category})\n`;
  }

  text += `\nCategory breakdown:\n`;
  if (categoryBreakdown.length > 0) {
    categoryBreakdown.forEach(cat => {
      text += `- ${cat.category}: ${formatINR(cat.amount)} (${cat.percentage.toFixed(1)}%)\n`;
    });
  } else {
    text += `None\n`;
  }

  text += `\nDaily breakdown:\n`;
  dailyBreakdown.forEach(d => {
    text += `- ${d.day} (${d.date}): ${formatINR(d.total)}\n`;
  });

  text += `\nComparison with previous week:\n`;
  text += `- Previous week: ${formatINR(prevTotalExpenses)}\n`;
  text += `- This week: ${formatINR(totalExpenses)}\n`;
  text += `- Change: ${spendingChangePct > 0 ? '+' : ''}${spendingChangePct.toFixed(1)}%\n\n`;
  text += `Personal Expense Tracker\n`;

  return text;
}

// Dispatch report via Resend with duplicate check & audit logging
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

  const resend = getResendClient();
  const sender = process.env.SENDER_EMAIL || 'Expense Tracker <onboarding@resend.dev>';
  const subject = `Your Weekly Expense and Budget Report (${summary.periodStart} - ${summary.periodEnd})`;

  if (!resend) {
    const errorMsg = 'RESEND_API_KEY is not configured or invalid in .env. Setup required before email can be dispatched.';
    // Log failure
    await db.addEmailLog({
      user_email: userEmail,
      recipient: userEmail,
      period_start: summary.periodStart,
      period_end: summary.periodEnd,
      status: 'FAILED',
      total_expense: summary.totalExpenses,
      total_income: summary.totalIncome,
      transactions_count: summary.transactionCount,
      error_message: errorMsg
    });

    return {
      success: false,
      setup_required: true,
      error: errorMsg,
      summary
    };
  }

  try {
    const html = generateEmailHtml(summary);
    const text = generateEmailText(summary);

    const result = await resend.emails.send({
      from: sender,
      to: [userEmail],
      subject: subject,
      html: html,
      text: text
    });

    if (result.error) {
      throw new Error(result.error.message || 'Resend API returned an error.');
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
      data: result.data,
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

// Send instant test verification email
export async function sendTestVerificationEmail(targetEmail) {
  const profile = await db.getProfile();
  const recipient = targetEmail || profile?.email;
  const name = profile?.full_name || 'User';

  if (!recipient) {
    throw new Error('No recipient email specified or configured in profile.');
  }

  const resend = getResendClient();
  const sender = process.env.SENDER_EMAIL || 'Expense Tracker <onboarding@resend.dev>';

  if (!resend) {
    return {
      success: false,
      setup_required: true,
      error: 'RESEND_API_KEY is not configured in .env. Please configure your Resend API key first.'
    };
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 20px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #4f46e5; margin-top: 0;">Connection Verified!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>This is a test email confirming that your <strong>Personal Expense Tracker</strong> email delivery service (Resend) is successfully connected and functioning!</p>
      <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px; margin: 16px 0;">
        <strong>Recipient:</strong> ${recipient}<br/>
        <strong>Sender:</strong> ${sender}<br/>
        <strong>Timestamp:</strong> ${new Date().toLocaleString()}
      </div>
      <p style="color: #64748b; font-size: 13px;">Your weekly expense and budget reports will be automatically delivered to this address according to your schedule.</p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: sender,
      to: [recipient],
      subject: 'Expense Tracker - Email Delivery Test Successful',
      html: html,
      text: `Hello ${name}, your email delivery connection is working successfully!`
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
