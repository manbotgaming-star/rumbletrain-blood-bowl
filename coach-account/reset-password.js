// ========================================
// GitHub: coach-account/reset-password.js
// ========================================
import { supabase } from '../shared/supabase-client.js?v=2';

const el = id => document.getElementById(id);
let ready = false, saved = false;

supabase.auth.onAuthStateChange(event => {
  setTimeout(() => {
    if (saved) return;

    if (event === 'PASSWORD_RECOVERY') {
      ready = true;
      el('reset-form').hidden = false;
      el('message').textContent = 'Choose a new password for your coach account.';
    } else if (
      event === 'SIGNED_OUT' ||
      (event === 'INITIAL_SESSION' && !ready)
    ) {
      ready = false;
      el('reset-form').hidden = true;
      el('message').textContent =
        'Open a fresh password-reset link from your email. If it expired or was already used, request another from coach sign-in.';
    }
  }, 0);
});

el('reset-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!ready) return;

  const password = el('new-password').value;
  if (password !== el('confirm-password').value) {
    el('message').textContent = 'The passwords do not match.';
    return;
  }

  el('save-password').disabled = true;
  el('message').textContent = 'Saving your new password…';

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    saved = true;
    ready = false;
    el('reset-form').reset();
    el('reset-form').hidden = true;
    el('message').textContent =
      'Password updated. Return to coach sign-in and use your new password.';

    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
    } catch {
      el('message').textContent =
        'Password updated. Return to the coach account page, sign out, then sign in with your new password.';
    }
  } catch (error) {
    el('message').textContent = 'Unable to update your password: ' + error.message;
  } finally {
    el('save-password').disabled = false;
  }
});
