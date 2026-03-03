import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wcylvnumkdogurygzaiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjeWx2bnVta2RvZ3VyeWd6YWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTIwODMsImV4cCI6MjA4NzY2ODA4M30.HwOInQFVS0I4a-QqMSF23kVp1WmZUBRiBg5CWBiegdg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function clearAll() {
    console.log('🗑️  Clearing system logs...');
    const { error: logErr } = await supabase.from('logs').delete().neq('id', 0);
    if (logErr) { console.error('❌ Failed to clear logs:', logErr.message); process.exit(1); }
    console.log('✅ Logs cleared.');

    console.log('🗑️  Clearing pending applications...');
    const { error: appErr } = await supabase.from('applications').delete().neq('id', 0);
    if (appErr) { console.error('❌ Failed to clear applications:', appErr.message); process.exit(1); }
    console.log('✅ Pending applications cleared.');

    console.log('🎉 All done! Database is fresh.');
}

clearAll();
