document.addEventListener('DOMContentLoaded', function() {
    // OTP verification form handler
    const otpForm = document.getElementById('otp-form');
    if (otpForm) {
        // Auto-focus first OTP input
        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs[0].focus();
        
        // Handle OTP input navigation
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', function() {
                if (this.value.length === 1) {
                    if (index < otpInputs.length - 1) {
                        otpInputs[index + 1].focus();
                    }
                }
            });
            
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && this.value.length === 0) {
                    if (index > 0) {
                        otpInputs[index - 1].focus();
                    }
                }
            });
        });
        
        otpForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('verify-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Verifying... <i class="fas fa-spinner fa-spin ml-2"></i>';
            
            // Combine OTP digits
            const otp = Array.from(otpInputs).map(input => input.value).join('');
            const email = sessionStorage.getItem('otpEmail');
            
            try {
                const response = await fetch('/api/auth/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    window.location.href = '/login';
                } else {
                    showError(data.message || 'OTP verification failed');
                    // Clear OTP inputs on error
                    otpInputs.forEach(input => input.value = '');
                    otpInputs[0].focus();
                }
            } catch (error) {
                showError('Network error. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Verify OTP';
            }
        });
    }
    
    // Resend OTP button handler
    const resendBtn = document.getElementById('resend-btn');
    if (resendBtn) {
        resendBtn.addEventListener('click', async function() {
            this.disabled = true;
            this.innerHTML = 'Sending... <i class="fas fa-spinner fa-spin ml-2"></i>';
            
            const email = sessionStorage.getItem('otpEmail');
            
            try {
                const response = await fetch('/api/auth/resend-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showSuccess('New OTP sent to your email!');
                } else {
                    showError(data.message || 'Failed to resend OTP');
                }
            } catch (error) {
                showError('Network error. Please try again.');
            } finally {
                setTimeout(() => {
                    this.disabled = false;
                    this.innerHTML = 'Resend OTP';
                }, 30000); // Enable after 30 seconds
            }
        });
    }
});

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden', 'bg-green-100', 'text-green-700');
    errorDiv.classList.add('bg-red-100', 'text-red-700');
    
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

function showSuccess(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden', 'bg-red-100', 'text-red-700');
    errorDiv.classList.add('bg-green-100', 'text-green-700');
    
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}