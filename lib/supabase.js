import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkmsctznkyoyxvkdhvhc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbXNjdHpua3lveXh2a2RodmhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjI4OTMsImV4cCI6MjA3MDgzODg5M30._alnaS65SQASX0NG9OGTwqF5WVNd3dK-N_i-RmD67zc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);