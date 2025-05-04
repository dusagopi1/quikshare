// models/Ride.js
const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pickup: { type: String, required: true },
  drop: { type: String, required: true },
  fare: { type: Number, required: true },
  seats: { type: Number, required: true },
  passengers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['active', 'completed'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);