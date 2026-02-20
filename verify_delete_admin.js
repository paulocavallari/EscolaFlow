const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aGpqc3hxb29nbWNhaXJlc3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ0Njk5NSwiZXhwIjoyMDg3MDIyOTk1fQ.J8udRfSV5ovz5cnMbQvm36ZwIE6AV2fGJklsXyfPvcE';

const adminSupabase = createClient(supabaseUrl, SERVICE_ROLE_KEY);

async function run() {
    console.log('--- Checking Classes ---');
    const { data: classes } = await adminSupabase.from('classes').select('id, name, active');
    console.log(`Total classes: ${classes.length}`);
    const inactiveClasses = classes.filter(c => c.active === false);
    console.log(`Inactive classes: ${inactiveClasses.length}`);
    if (inactiveClasses.length > 0) {
        console.log('Inactive classes:', inactiveClasses.map(c => c.name));
    }

    console.log('\n--- Checking Students ---');
    const { data: students } = await adminSupabase.from('students').select('id, name, active');
    console.log(`Total students: ${students.length}`);
    const inactiveStudents = students.filter(s => s.active === false);
    console.log(`Inactive students: ${inactiveStudents.length}`);
    if (inactiveStudents.length > 0) {
        console.log('Inactive students:', inactiveStudents.map(s => s.name));
    }
}
run();
