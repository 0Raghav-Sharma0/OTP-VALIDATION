const User = require('../models/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Session = require('../models/Session');

// Enhanced email transporter with debugging
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    logger: true,
    debug: true
});

// Verify connection configuration
transporter.verify((error) => {
    if (error) {
        console.error('❌ SMTP Connection Error:', error);
    } else {
        console.log('✅ SMTP Server Ready');
    }
});

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// Improved email sending function
const sendOTPEmail = async (email, name, otp) => {
    try {
        console.log(`Preparing OTP email for ${email}`);
        
        const mailOptions = {
            from: `"OTP Verification" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Verification OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">OTP Verification</h2>
                    <p>Hello ${name},</p>
                    <p>Your verification code is:</p>
                    <h1 style="background: #f3f4f6; display: inline-block; padding: 10px 20px; border-radius: 5px;">
                        ${otp}
                    </h1>
                    <p>This code will expire in 10 minutes.</p>
                    <p style="color: #6b7280;">If you didn't request this, please ignore this email.</p>
                </div>
            `
        };

        console.log('Sending email to:', email);
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        throw error;
    }
};

/**
 * @desc    Register new user with enhanced email sending
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters',
                field: 'password'
            });
        }

        // Check if user exists (case insensitive)
        const existingUser = await User.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') } 
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        // Create user
        const user = new User({
            name,
            email,
            password,
            otp,
            otpExpiry
        });

        await user.save();

        // Send OTP email with retry logic
        try {
            await sendOTPEmail(email, name, otp);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
            // Delete the user if email fails
            await User.deleteOne({ _id: user._id });
            throw new Error('Failed to send OTP email');
        }

        res.status(201).json({
            success: true,
            message: 'OTP sent to your email',
            data: { email }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


/**
 * @desc    Verify OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Validate OTP
    if (user.otp !== otp || user.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Create session
    req.session.user = { 
      id: user._id, 
      email: user.email, 
      name: user.name 
    };

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: { 
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification',
      error: error.message
    });
  }
};

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send new OTP
    await transporter.sendMail({
      from: `"OTP Verification" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your New Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New OTP Verification</h2>
          <p>Your new verification code is:</p>
          <h1 style="background: #f3f4f6; display: inline-block; padding: 10px 20px; border-radius: 5px;">
            ${otp}
          </h1>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'New OTP sent successfully',
      data: { email }
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resending OTP',
      error: error.message
    });
  }
};
/**
 * @desc    Forgot Password - Send reset token via email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 2. Generate reset token (expires in 10 mins)
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    // 3. Send email
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    
    await transporter.sendMail({
      from: `"Password Reset" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: #2563eb;">Password Reset</h2>
          <p>You requested a password reset. Click the link below:</p>
          <a href="${resetUrl}" 
             style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
          <p>This link expires in 10 minutes.</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Password reset email sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing forgot password',
      error: error.message
    });
  }
};

/**
 * @desc    Reset Password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
/**
 * @desc    Reset Password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        // Validate inputs
        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({ 
                success: false,
                message: 'Token, newPassword and confirmPassword are required' 
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ 
                success: false,
                message: 'Passwords do not match' 
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ 
                success: false,
                message: 'Password must be at least 8 characters' 
            });
        }

        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid or expired token' 
            });
        }

        // Update password - pre-save hook will handle hashing
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save();

        // Clear existing sessions
        if (Session) {
            await Session.deleteMany({ 'session.user.email': user.email });
        }

        res.json({ 
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('❌ Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    console.log('\n=== NEW LOGIN ATTEMPT ===');
    console.log('Request body:', req.body);
    console.log('Session ID at start:', req.sessionID);

    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // 1. Find user with case-insensitive email search
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!user) {
      console.log('❌ User not found in database for email:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    console.log('ℹ️ User found:', {
      id: user._id,
      email: user.email,
      isVerified: user.isVerified,
      passwordHash: user.password.substring(0, 10) + '...'
    });

    // 2. Check verification status first
    if (!user.isVerified) {
      console.log('⚠️ User not verified:', user.email);
      return res.status(403).json({ 
        success: false,
        message: 'Please verify your email first' 
      });
    }

    // 3. Verify password with detailed logging
    console.log('Comparing password with hash...');
    const isMatch = await user.comparePassword(password);
    console.log('Password comparison result:', isMatch ? '✅ Match' : '❌ Mismatch');
    
    if (!isMatch) {
      console.log('❌ Incorrect password for user:', user.email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // 4. Create session with enhanced data
    req.session.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      sessionCreated: new Date()
    };

    // 5. Save session with timeout handling
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          console.error('💥 Session save error:', err);
          reject(err);
        } else {
          console.log('🔐 Session saved successfully:', req.session);
          resolve();
        }
      });
    });

    console.log('✔️ Login successful for:', user.email);
    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('🔥 Critical login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    console.log('Attempting to logout session:', req.sessionID);
    
    // Destroy the session
    req.session.destroy(err => {
      if (err) {
        console.error('❌ Session destruction error:', err);
        return res.status(500).json({
          success: false,
          message: 'Logout failed'
        });
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      console.log('✅ Session destroyed successfully');
      return res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};
exports.dashboard = async (req, res) => {
  try {
    // User is already authenticated by authMiddleware
    res.json({
      success: true,
      message: `Welcome ${req.session.user.name}`,
      data: {
        user: req.session.user
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard',
      error: error.message
    });
  }
};