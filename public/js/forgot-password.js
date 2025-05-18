document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value
      })
    });

    const data = await response.json();
    
    if (!response.ok) throw new Error(data.message || 'Failed to send email');
    
    alert('Check your email for the reset link');
    window.location.href = '/login';
    
  } catch (error) {
    document.getElementById('error-message').textContent = error.message;
    document.getElementById('error-message').classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Reset Link';
  }
});