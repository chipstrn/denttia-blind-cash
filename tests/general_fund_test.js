const assert = require('assert');

// Mock Data
const cuts = [
    { id: 1, valid_date: '2023-01-01', cash_counted: 1000 }
];

const expenses = [
    { id: 101, valid_date: '2023-01-01', amount: 100, is_general_fund: false, category: 'materials' },
    { id: 102, valid_date: '2023-01-01', amount: 50, is_general_fund: true, category: 'rent' } // General Fund
];

console.log('--- Starting General Fund Simulation Test ---');

// 1. Test Daily View Logic (Should EXCLUDE General Fund)
console.log('\n[Test 1] Daily View Logic');
const dailyViewExpenses = expenses.filter(e => !e.is_general_fund);
const dailyExpensesTotal = dailyViewExpenses.reduce((sum, e) => sum + e.amount, 0);

console.log('Total Expenses (Daily View):', dailyExpensesTotal);
console.log('Expected: 100');

try {
    assert.strictEqual(dailyExpensesTotal, 100, 'Daily view should only include regular expenses');
    console.log('✅ PASS: Daily View correctly excludes General Fund expenses.');
} catch (e) {
    console.error('❌ FAIL:', e.message);
    process.exit(1);
}

// 2. Test Global Cash Logic (Should INCLUDE General Fund)
// logic: Total Cash = Sum(Cash Counted) - Sum(All Cash Expenses)
console.log('\n[Test 2] Global Cash Logic');
const totalIncome = cuts.reduce((sum, c) => sum + c.cash_counted, 0);
const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0); // Includes GF
const netCash = totalIncome - totalExpenses;

console.log('Total Income:', totalIncome);
console.log('Total Expenses (Global):', totalExpenses);
console.log('Net Cash:', netCash);
console.log('Expected Net Cash: 1000 - 150 = 850');

try {
    assert.strictEqual(netCash, 850, 'Global view should deduct ALL expenses');
    console.log('✅ PASS: Global View correctly includes General Fund expenses in deduction.');
} catch (e) {
    console.error('❌ FAIL:', e.message);
    process.exit(1);
}

console.log('\n✅ All simulation tests passed.');
