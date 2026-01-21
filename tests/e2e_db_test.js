/**
 * E2E Database Test Script for Denttia Blind Cash Admin Panel (Read-Only)
 * 
 * This script tests the core database READ operations that the admin panel relies on.
 * Insert/Delete require authenticated user, so we skip those.
 * 
 * Validates:
 * 1. Blind cut listing by date range
 * 2. Expense listing by valid_date
 * 3. Expense aggregation per date (for reconciliation)
 */

require('dotenv').config({ path: '/Users/teran/.gemini/antigravity/scratch/denttia-blind-cash/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL or SUPABASE_ANON_KEY not found in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
    console.log('🧪 Starting E2E Database Tests (Read-Only)...\n');
    let allPassed = true;

    // Test 1: List blind_cuts for a week
    console.log('--- Test 1: List Blind Cuts for Week (Jan 20-26, 2026) ---');
    try {
        const weekStart = '2026-01-20';
        const weekEnd = '2026-01-26';
        const { data, error } = await supabase
            .from('blind_cuts')
            .select('id, valid_date, user_name, cash_counted, voucher_counted, expected_cash, expected_voucher')
            .gte('valid_date', weekStart)
            .lte('valid_date', weekEnd)
            .order('valid_date', { ascending: true });

        if (error) throw error;
        console.log(`✅ Found ${data.length} blind cuts for week ${weekStart} to ${weekEnd}.`);
        if (data.length > 0) {
            data.forEach(cut => {
                console.log(`   - ${cut.valid_date} | ${cut.user_name} | Cash: ${cut.cash_counted} | Voucher: ${cut.voucher_counted}`);
            });
        } else {
            console.log('   (No cuts in this period - this is OK for a clean database)');
        }
    } catch (e) {
        console.error('❌ Blind cut listing failed:', e.message);
        allPassed = false;
    }

    // Test 2: List expenses for a week (using valid_date)
    console.log('\n--- Test 2: List Expenses for Week (Jan 20-26, 2026) ---');
    try {
        const weekStart = '2026-01-20';
        const weekEnd = '2026-01-26';
        const { data, error } = await supabase
            .from('expenses')
            .select('id, valid_date, user_name, category, amount, description')
            .gte('valid_date', weekStart)
            .lte('valid_date', weekEnd)
            .order('valid_date', { ascending: true });

        if (error) throw error;
        console.log(`✅ Found ${data.length} expenses for week ${weekStart} to ${weekEnd}.`);
        if (data.length > 0) {
            data.forEach(exp => {
                console.log(`   - ${exp.valid_date} | ${exp.category} | $${exp.amount} | ${exp.description}`);
            });
        } else {
            console.log('   (No expenses in this period - this is OK for a clean database)');
        }
    } catch (e) {
        console.error('❌ Expense listing failed:', e.message);
        allPassed = false;
    }

    // Test 3: Aggregate expenses for a specific date (simulating reconciliation)
    console.log('\n--- Test 3: Aggregate Expenses for 2026-01-21 ---');
    try {
        const targetDate = '2026-01-21';
        const { data, error } = await supabase
            .from('expenses')
            .select('amount')
            .eq('valid_date', targetDate);

        if (error) throw error;
        const total = data.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        console.log(`✅ Total expenses for ${targetDate}: $${total.toFixed(2)} (${data.length} entries)`);
    } catch (e) {
        console.error('❌ Aggregation failed:', e.message);
        allPassed = false;
    }

    // Test 4: Query both tables in parallel (simulating loadWeeklyAuditCore)
    console.log('\n--- Test 4: Parallel Query (Cuts + Expenses) ---');
    try {
        const weekStart = '2026-01-20';
        const weekEnd = '2026-01-26';

        const [cutsResult, expensesResult] = await Promise.all([
            supabase.from('blind_cuts').select('*').gte('valid_date', weekStart).lte('valid_date', weekEnd),
            supabase.from('expenses').select('*').gte('valid_date', weekStart).lte('valid_date', weekEnd)
        ]);

        if (cutsResult.error) throw cutsResult.error;
        if (expensesResult.error) throw expensesResult.error;

        console.log(`✅ Parallel query succeeded. Cuts: ${cutsResult.data.length}, Expenses: ${expensesResult.data.length}`);

        // Simulate reconciliation mapping
        const expensesByDate = {};
        expensesResult.data.forEach(exp => {
            if (!expensesByDate[exp.valid_date]) expensesByDate[exp.valid_date] = [];
            expensesByDate[exp.valid_date].push(exp);
        });
        console.log(`   Expense dates found: ${Object.keys(expensesByDate).join(', ') || '(none)'}`);
    } catch (e) {
        console.error('❌ Parallel query failed:', e.message);
        allPassed = false;
    }

    console.log('\n' + '='.repeat(50));
    if (allPassed) {
        console.log('🎉 All E2E Database Tests PASSED!');
    } else {
        console.log('⚠️  Some tests failed. Review output above.');
    }
}

runTests().catch(console.error);
