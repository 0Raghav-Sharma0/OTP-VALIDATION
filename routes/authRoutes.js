const express = require('express');
const {
    register,
    verifyOTP,
    resendOTP,
    login,
    logout,
    dashboard,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/logout', authMiddleware, logout);
router.get('/dashboard', authMiddleware, dashboard);

module.exports = router;