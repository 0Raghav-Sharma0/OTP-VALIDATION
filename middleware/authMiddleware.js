module.exports = (req, res, next) => {
    console.log('Session check:', req.session);
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false,
            message: "Unauthorized. Please log in first." 
        });
    }
    next();
};