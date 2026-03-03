import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wcylvnumkdogurygzaiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjeWx2bnVta2RvZ3VyeWd6YWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTIwODMsImV4cCI6MjA4NzY2ODA4M30.HwOInQFVS0I4a-QqMSF23kVp1WmZUBRiBg5CWBiegdg';

const NEW_COUNTERS = [
    { name: 'shahzad', count: 23 },
    { name: 'hanan', count: 6 },
    { name: 'mazhar', count: 35 },
    { name: 'hassam', count: 18 },
    { name: 'bilal', count: 24 },
    { name: 'momin', count: 15 },
    { name: 'taaha', count: 45 },
    { name: 'quddoos', count: 18 },
    { name: 'qadeer', count: 26 },
    { name: 'ali', count: 27 },
    { name: 'abdullah', count: 32 },
    { name: 'hammad', count: 34 },
    { name: 'huzaifa', count: 26 },
    { name: 'ibtasam', count: 41 },
    { name: 'muhammad', count: 26 },
    { name: 'chair', count: 11 },
    { name: 'hamza', count: 5 },
    { name: 'marwan', count: 25 },
    { name: 'shahmeer', count: 25 },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seed() {
    console.log('🗑️  Deleting old counters...');
    const { error: deleteError } = await supabase.from('counters').delete().neq('name', '__none__');
    if (deleteError) {
        console.error('❌ Delete failed:', deleteError.message);
        process.exit(1);
    }

    console.log('✅ Old data cleared. Inserting new counters...');
    const { error: insertError } = await supabase.from('counters').insert(NEW_COUNTERS);
    if (insertError) {
        console.error('❌ Insert failed:', insertError.message);
        process.exit(1);
    }

    console.log('🎉 Done! New counters inserted successfully:');
    NEW_COUNTERS.forEach(c => console.log(`   ${c.name}: ${c.count}`));
}

seed();
