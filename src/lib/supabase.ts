import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase Project URL and Anon Key
const supabaseUrl = 'https://fnwkkpwoznrkxqaphfpi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2trcHdvem5ya3hxYXBoZnBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTU5MDEsImV4cCI6MjA5NTM5MTkwMX0.5yTfjnVtL5RxvSFRJ2g0Idq-zanq3XBbZUPm44xk06s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});