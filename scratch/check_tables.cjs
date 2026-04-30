const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data, error } = await supabase.from('LeaveManagement').select('*').limit(1);
  if (error) {
    console.log('LeaveManagement table might not exist or error:', error.message);
  } else {
    console.log('LeaveManagement table exists.');
  }

  const { data: empData, error: empError } = await supabase.from('employees').select('*').limit(1);
  if (empData && empData.length > 0) {
    console.log('Employees columns:', Object.keys(empData[0]));
  }
}

checkTables();
