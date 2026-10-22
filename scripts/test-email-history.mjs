import { db } from '../server/db.js';

console.log('Testing email-scoped history persistence...');

// 1. Add expense for User 1
const exp1 = await db.addExpense({
  user_email: 'user1@example.com',
  amount: 250,
  description: 'Lunch at Cafe',
  category: 'Food & Drinks',
  date: '2026-10-22',
  time: '12:30:00'
});

// 2. Add expense for User 2
const exp2 = await db.addExpense({
  user_email: 'user2@example.com',
  amount: 500,
  description: 'Fuel filling',
  category: 'Transportation',
  date: '2026-10-22',
  time: '14:00:00'
});

// 3. Add income for User 1
const inc1 = await db.addIncome({
  user_email: 'user1@example.com',
  amount: 15000,
  source: 'Freelance Design',
  category: 'Salary',
  date: '2026-10-22'
});

// 4. Verify User 1 history
const user1Exps = await db.getExpenses('user1@example.com');
const user1Incs = await db.getIncomes('user1@example.com');
console.log('User 1 Expenses count:', user1Exps.length, 'Descriptions:', user1Exps.map(e => e.description));
console.log('User 1 Incomes count:', user1Incs.length, 'Sources:', user1Incs.map(i => i.source));

if (user1Exps.some(e => e.description === 'Lunch at Cafe') && !user1Exps.some(e => e.description === 'Fuel filling')) {
  console.log('✅ User 1 expenses isolated correctly');
} else {
  console.error('❌ User 1 expenses isolation failed');
  process.exit(1);
}

// 5. Verify User 2 history
const user2Exps = await db.getExpenses('user2@example.com');
console.log('User 2 Expenses count:', user2Exps.length, 'Descriptions:', user2Exps.map(e => e.description));
if (user2Exps.some(e => e.description === 'Fuel filling') && !user2Exps.some(e => e.description === 'Lunch at Cafe')) {
  console.log('✅ User 2 expenses isolated correctly');
} else {
  console.error('❌ User 2 expenses isolation failed');
  process.exit(1);
}

// 6. Test ID preservation in addExpense
const customId = 'exp-custom-12345';
const preserved = await db.addExpense({
  id: customId,
  user_email: 'user1@example.com',
  amount: 100,
  description: 'Preserved ID transaction',
  category: 'Shopping',
  date: '2026-10-22',
  time: '15:00:00'
});

if (preserved.id === customId) {
  console.log('✅ ID preservation works as expected for offline sync');
} else {
  console.error('❌ ID preservation failed:', preserved.id);
  process.exit(1);
}

// Clean up test data
await db.deleteExpense(exp1.id);
await db.deleteExpense(exp2.id);
await db.deleteExpense(customId);
await db.deleteIncome(inc1.id);

console.log('🎉 All email history tests passed successfully!');
