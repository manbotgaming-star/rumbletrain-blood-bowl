// ========================================
// GitHub: coach-account/password-recovery.js
// ========================================
import { supabase } from '../shared/supabase-client.js?v=2';

const button = document.getElementById('forgot-password');

button.addEventListener('click', async () => {
  const email = document.getElementById('email');
  if (!email.reportValidity()) return;

  const message = document.getElementById('message');
  button.disabled = true;
  message.textContent = 'Sending password-reset instructions…';

  try {
    const redirectTo = new URL('./reset-password.html', location.href).href;
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.value.trim(), { redirectTo }
    );
    if (error) throw error;

    if (!document.getElementById('login').hidden) {
      message.textContent =
        'If that email has an account, a reset link is on its way. Check your inbox and spam folder.';
    }
  } catch (error) {
    if (!document.getElementById('login').hidden) {
      message.textContent = 'Unable to send reset instructions: ' + error.message;
    }
  } finally {
    button.disabled = false;
  }
});
