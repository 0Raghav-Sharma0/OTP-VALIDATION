document.addEventListener('DOMContentLoaded', () => {
    // Extract token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        window.location.href = '/forgot-password?error=missing_token';
        return;
    }

    // Set token in hidden input field
    const tokenInput = document.getElementById('reset-token');
    if (tokenInput) tokenInput.value = token;

    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', () => {
            const input = button.previousElementSibling;
            const icon = button.querySelector('i');
            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            }
        });
    });

    // Handle password reset form submission
    const form = document.getElementById('reset-password-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.getElementById('reset-btn');
            const errorDiv = document.getElementById('error-message');
            const successDiv = document.getElementById('success-message');

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
            if (errorDiv) errorDiv.classList.add('hidden');

            try {
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: tokenInput.value,
                        newPassword: document.getElementById('new-password').value,
                        confirmPassword: document.getElementById('confirm-password').value
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Password reset failed');
                }

                if (successDiv) {
                    successDiv.textContent = data.message;
                    successDiv.classList.remove('hidden');
                }

                setTimeout(() => {
                    window.location.href = '/login?reset=success';
                }, 2000);

            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.classList.remove('hidden');
                }
            } finally {
                btn.disabled = false;
                btn.textContent = 'Reset Password';
            }
        });
    }
});
