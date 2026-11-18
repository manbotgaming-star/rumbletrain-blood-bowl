// ========================================
// GitHub: shared/supabase-client.js
// ========================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';

export const supabase = createClient(
  'https://dahuwcfrwkshtkjxudij.supabase.co',
  'sb_publishable_xZaw1wxRCmMrQDo5Cojz3Q_FhUuDUFX',
  { auth: {
    persistSession: true, autoRefreshToken: true, flowType: 'implicit',
    detectSessionInUrl: location.pathname.endsWith('/reset-password.html'),
    storage: sessionStorage
  } }
);
