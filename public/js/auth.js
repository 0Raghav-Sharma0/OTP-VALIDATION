document.addEventListener('DOMContentLoaded', function () {
    // ===== IMPROVED REGISTER FORM HANDLER =====
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = document.getElementById('register-btn');
            const errorDiv = document.getElementById('error-message');
            const password = document.getElementById('password').value;
            
            // Clear previous errors
            errorDiv.classList.add('hidden');

            // Frontend validation
            if (password.length < 8) {
                showError('Password must be at least 8 characters');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Sending OTP... <i class="fas fa-spinner fa-spin ml-2"></i>';

            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                password: password
            };

            try {
                const response = await fetch('http://localhost:3000/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    sessionStorage.setItem('otpEmail', formData.email);
                    window.location.href = '/verify-otp';
                } else {
                    showError(data.message || 'Registration failed');
                }
            } catch (error) {
                showError('Network error. Please try again.');
                console.error('Registration error:', error);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Register';
            }
        });
    }

    // ===== LOGIN FORM HANDLER =====
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = document.getElementById('login-btn');
            const errorDiv = document.getElementById('error-message');

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            errorDiv.classList.add('hidden');

            try {
                console.log('Attempting login with:', { email, password });

                const response = await fetch('http://localhost:3000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                console.log('Full login response:', { status: response.status, data });

                if (!response.ok) {
                    throw new Error(data.message || `Login failed with status ${response.status}`);
                }

                window.location.href = '/dashboard';

            } catch (error) {
                console.error('Full login error:', error);
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
        });
    }

    // ===== LOGOUT BUTTON HANDLER =====
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            console.log('Logout initiated');
            const btn = this;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';

            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });

                const data = await response.json();
                console.log('Logout response:', data);

                if (!response.ok) {
                    throw new Error(data.message || 'Logout failed');
                }

                window.location.href = '/login';

            } catch (error) {
                console.error('Logout error:', error);
                alert('Logout failed: ' + error.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Logout';
            }
        });
    }

    // ===== ERROR DISPLAY FUNCTION =====
    function showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (!errorDiv) return;

        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');

        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }
});
