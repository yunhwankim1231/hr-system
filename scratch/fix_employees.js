import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetch }
});

async function fixEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .update({ resident_number: null })
    .eq('resident_number', '000000-0000000');
    
  if (error) {
    console.error('Error updating employees:', error);
    return;
  }
  console.log('Fixed employees with dummy resident numbers.');
}

fixEmployees();
