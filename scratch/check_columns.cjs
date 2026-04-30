const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('employees').select('*').limit(1);
  if (error) {
    console.error('Error fetching employees:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in employees table:', Object.keys(data[0]));
  } else {
    console.log('No data in employees table to check columns.');
  }
}

checkColumns();
