
const { createClient } = require('@supabase/supabase-js');

// Config options
const verifySplitIncome = true;

const supabaseUrl = 'https://dwlpcfmfrihjpqjvtarv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3bHBjZm1mcmloanBxanZ0YXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODQ0OTQsImV4cCI6MjA4NDQ2MDQ5NH0.6FS23kEgkbFw4lwJXiXcc5ov93AqrBrCqsj_5glC6W4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log('🧪 Verifying Split Income & Backdating...');

    // Since RLS blocks inserts from this script (anon), we'll do query verification via SQL logic if possible, 
    // or just assume if no errors in previous steps we are good.
    // However, I can try to INSERT via the script to test the schema IF I had a service role key or user token,
    // but I don't.

    // Instead, I'll print the instructions to MANUAL TEST since RLS is active.

    console.log('⚠️  Cannot insert directly due to RLS. Please performing the following manual test:');
    console.log('1. Open Receptionist View');
    console.log('2. Select a Date (e.g., Yesterday)');
    console.log('3. Enter Cash: 100, Voucher: 200');
    console.log('4. Expenses: Add one expense of 50');
    console.log('5. Submit');
    console.log('6. Open Admin View -> Weekly Audit');
    console.log('7. Find the entry for that date');
    console.log('8. Verify Total Counted is $300');
    console.log('9. Click it and verify Separated Amounts: Cash $100, Vouchers $200');

    // I will try to read the DB to see if any recent backdated cuts exist (if I seeded any... I didn't seed split ones yet)

}

runTest();
