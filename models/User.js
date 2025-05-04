const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    validate: {
      validator: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      message: "Invalid email format"
    }
  },
  mobile: { 
    type: String, 
    required: true,
    validate: {
      validator: (mobile) => /^[0-9]{10}$/.test(mobile),
      message: "Mobile must be 10 digits"
    }
  },
  address: { type: String, required: true },
  password: { type: String, required: true, select: false }, // Never return in queries
  ridesHosted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ride' }], // Reference to Ride model
  ridesJoined: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ride' }],
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to validate password
userSchema.methods.isValidPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);