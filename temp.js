// Run this in your Node.js environment or MongoDB shell
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync("raghav@123", salt);
console.log("HASH:", hash);