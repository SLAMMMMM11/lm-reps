import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// La anon key es publica por diseno: la seguridad real la da Row Level
// Security (RLS) configurada en Supabase, no el secreto de esta key.
const SUPABASE_URL = 'https://fwpuzvevenwhylryljjh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3cHV6dmV2ZW53aHlscnlsampoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MTU2NTEsImV4cCI6MjA5NzQ5MTY1MX0.y-6ki1zQNRHPNihrJ2rDyuBnb3FpkpzdBAm-6MH7wLw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
