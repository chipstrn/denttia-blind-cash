
// require('dotenv').config(); // Removed dependency
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dwlpcfmfrihjpqjvtarv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3bHBjZm1mcmloanBxanZ0YXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODQ0OTQsImV4cCI6MjA4NDQ2MDQ5NH0.6FS23kEgkbFw4lwJXiXcc5ov93AqrBrCqsj_5glC6W4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
    console.log('🧪 Starting System Verification...');

    const testUser = 'b1a0f6cf-3681-4603-a0a0-c14d414c115b'; // CarloRecepción
    let expenseId = null;

    // 1. TEST ADD EXPENSE (Simulate "Past Week" Logic)
    console.log('\n📝 Test 1: Add Expense (Backdated)');
    const pastDate = '2026-01-18T20:00:00.000Z'; // Sunday of the test week

    const { data: insertData, error: insertError } = await supabase
        .from('expenses')
        .insert({
            user_id: testUser,
            user_name: 'TEST_RUNNER',
            category: 'otros',
            payment_method: 'efectivo',
            description: 'Test Expense Original',
            amount: 100.00,
            created_at: pastDate
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Insert Failed:', insertError.message);
        process.exit(1);
    }
    expenseId = insertData.id;
    console.log('✅ Expense Added:', insertData.id);
    console.log('   Date:', insertData.created_at);

    // 2. TEST UPDATE EXPENSE (Edit Feature)
    console.log('\n✏️ Test 2: Update Expense');
    const { data: updateData, error: updateError } = await supabase
        .from('expenses')
        .update({
            amount: 500.00,
            description: 'Test Expense Updated'
        })
        .eq('id', expenseId)
        .select()
        .single();

    if (updateError) {
        console.error('❌ Update Failed:', updateError.message);
        process.exit(1);
    }

    if (updateData.amount === 500 && updateData.description === 'Test Expense Updated') {
        console.log('✅ Expense Updated Successfully');
    } else {
        console.error('❌ Update Mismatch:', updateData);
        process.exit(1);
    }

    // 3. TEST DELETE EXPENSE
    console.log('\n🗑️ Test 3: Delete Expense');
    const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

    if (deleteError) {
        console.error('❌ Delete Failed:', deleteError.message);
        process.exit(1);
    }

    // Verify gone
    const { data: checkData } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expenseId);

    if (checkData.length === 0) {
        console.log('✅ Expense Deleted Successfully');
    } else {
        console.error('❌ Expense Still Exists');
        process.exit(1);
    }

    console.log('\n🎉 ALL SYSTEM TESTS PASSED!');
}

runTests();
