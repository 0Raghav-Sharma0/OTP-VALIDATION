const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'],
        trim: true
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters']
    },
    otp: { type: String },
    otpExpiry: { type: Date },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    passwordUpdatedAt: Date
}, { 
    timestamps: true 
});

// Improved password hashing middleware
UserSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified
    if (!this.isModified('password')) return next();

    try {
        console.log(`🔑 Hashing password for ${this.email}`);
        
        // Generate salt (12 rounds is current best practice)
        const salt = await bcrypt.genSalt(12);
        
        // Hash the password with the salt
        this.password = await bcrypt.hash(this.password, salt);
        
        // Record when password was last updated
        this.passwordUpdatedAt = new Date();
        
        next();
    } catch (err) {
        console.error('❌ Password hashing error:', err);
        next(err);
    }
});

// Enhanced password comparison method
UserSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        console.log(`🔍 Comparing password for ${this.email}`);
        
        // Trim whitespace from candidate password
        candidatePassword = candidatePassword.trim();
        
        // Compare the passwords
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        
        console.log(`🔑 Comparison result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        
        return isMatch;
    } catch (error) {
        console.error('❌ Password comparison error:', error);
        return false;
    }
};

// Add method to check if password needs rehashing
UserSchema.methods.needsRehash = function() {
    // Check if password was hashed with insufficient rounds
    return this.password.startsWith('$2a$10$'); // Only if using 10 rounds
};

module.exports = mongoose.model('User', UserSchema);