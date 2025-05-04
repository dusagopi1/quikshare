require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
// import { io } from "socket.io-client";

// Environment Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Socket.IO configuration with CORS
const io = new Server(server, {
  cors: {
    origin: NODE_ENV === 'production' ? process.env.CLIENT_URL : '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: NODE_ENV === 'production' ? process.env.CLIENT_URL : '*',
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection with retry logic
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`MongoDB Connected in ${NODE_ENV} mode`);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Models
const User = require('./models/User');
const Ride = require('./models/Ride');

// JWT Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// ========== API ROUTES ==========
app.post('/api/rides/host', authenticate, async (req, res) => {
  try {
    const { pickup, drop, fare, seats } = req.body;
    
    const ride = new Ride({
      hostId: req.user._id,
      pickup,
      drop,
      fare: Number(fare),
      seats: Number(seats)
    });

    await ride.save();
    
    // Add ride to user's hosted rides
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { ridesHosted: ride._id } }
    );

    res.status(201).json(ride);
  } catch (err) {
    res.status(500).json({ message: 'Error hosting ride' });
  }
});

app.get('/api/rides/active', authenticate, async (req, res) => {
  try {
    const rides = await Ride.find({ status: 'active' })
      .populate('hostId', 'firstName rating')
      .populate('passengers.userId', 'firstName');

    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching rides' });
  }
});

app.get('/api/rides/search', authenticate, async (req, res) => {
  try {
    const { pickup, drop } = req.query;
    
    const rides = await Ride.find({
      status: 'active',
      $or: [
        { pickup: { $regex: pickup, $options: 'i' } },
        { drop: { $regex: drop, $options: 'i' } }
      ]
    })
    .populate('hostId', 'firstName rating');

    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: 'Search failed' });
  }
});

app.post('/api/rides/:rideId/join', authenticate, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    
    // Check if already joined
    const alreadyJoined = ride.passengers.some(
      p => p.userId.toString() === req.user._id.toString()
    );
    
    if (alreadyJoined) {
      return res.status(400).json({ message: 'Already joined this ride' });
    }

    // Check seat availability
    if (ride.passengers.length >= ride.seats) {
      return res.status(400).json({ message: 'No seats available' });
    }

    // Add passenger
    ride.passengers.push({ userId: req.user._id });
    await ride.save();
    
    // Add ride to user's joined rides
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { ridesJoined: ride._id } }
    );

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: 'Error joining ride' });
  }
});

// User History - No authentication required
// Delete a ride
// Update a ride
app.put('/api/rides/:id', authenticate, async (req, res) => {
  try {
    const { pickup, drop, seats, fare } = req.body;
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if user is the host of the ride
    if (ride.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this ride' });
    }

    // Update ride details
    ride.pickup = pickup;
    ride.drop = drop;
    ride.seats = Number(seats);
    ride.fare = Number(fare);

    await ride.save();
    
    res.json(ride);
  } catch (err) {
    console.error('Error updating ride:', err);
    res.status(500).json({ message: 'Error updating ride' });
  }
});

// Delete a ride
app.delete('/api/rides/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ride ID format' });
    }

    // Find the ride by its ID
    const ride = await Ride.findById(req.params.id);
    console.log(`Attempting to delete ride ${req.params.id}`);

    if (!ride) {
      console.log(`Ride ${req.params.id} not found`);
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Ensure that the user is the host of the ride
    if (ride.hostId.toString() !== req.user._id.toString()) {
      console.log(`User ${req.user._id} not authorized to delete ride ${req.params.id}`);
      return res.status(403).json({ message: 'Not authorized to delete this ride' });
    }

    // Delete the ride from the database
    const deletedRide = await Ride.findByIdAndDelete(req.params.id);
    if (!deletedRide) {
      console.log(`Failed to delete ride ${req.params.id}`);
      return res.status(500).json({ message: 'Failed to delete ride' });
    }

    // Remove the ride from the host's ridesHosted array
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { ridesHosted: req.params.id } }
    );

    // Remove the ride from the passengers' ridesJoined arrays
    if (ride.passengers && ride.passengers.length > 0) {
      await User.updateMany(
        { _id: { $in: ride.passengers.map(p => p.userId) } },
        { $pull: { ridesJoined: req.params.id } }
      );
    }

    console.log(`Successfully deleted ride ${req.params.id}`);


    res.json({ message: 'Ride deleted successfully' });
  } catch (err) {
    console.error('Error deleting ride:', err);
    res.status(500).json({ message: 'Error deleting ride' });
  }
});



app.get('/api/user/history', async (req, res) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // Return empty history for unauthenticated users
      return res.json({
        hosted: [],
        joined: []
      });
    }

    try {
      // Verify token and get user
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId)
        .populate('ridesHosted')
        .populate('ridesJoined');

      if (!user) {
        return res.json({
          hosted: [],
          joined: []
        });
      }

      res.json({
        hosted: user.ridesHosted,
        joined: user.ridesJoined
      });
    } catch (tokenError) {
      // Invalid token, return empty history
      return res.json({
        hosted: [],
        joined: []
      });
    }
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ message: 'Error fetching history' });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, address, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'User already exists with this email' });

    const user = new User({ firstName, lastName, email, mobile, address, password });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.isValidPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// Get all active rides
app.get('/api/rides', async (req, res) => {
  try {
    const rides = await Ride.find({ status: 'active' })
      .populate('hostId', 'firstName lastName')
      .sort('-createdAt');
    res.json(rides);
  } catch (err) {
    console.error('Error fetching rides:', err);
    res.status(500).json({ message: 'Failed to fetch rides' });
  }
});

// Host a ride
app.post('/api/rides/host', authenticate, async (req, res) => {
  try {
    const { pickup, drop, fare, seats, secretCode } = req.body;

    const ride = new Ride({
      hostId: req.user._id,
      pickup,
      drop,
      fare: Number(fare),
      seats: Number(seats),
      secretCode,
    });

    await ride.save();

    await User.findByIdAndUpdate(req.user._id, {
      $push: { ridesHosted: ride._id },
    });

    res.status(201).json(ride);
  } catch (err) {
    console.error('Error hosting ride:', err);
    res.status(500).json({ message: 'Error hosting ride' });
  }
});

// ========== SOCKET.IO ==========

// Store user locations by room: { roomId: { userId: { lat, lng } } }
const userLocations = {};

io.on('connection', (socket) => {
  const userId = uuidv4();
  socket.userId = userId;

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;

    // Send this user's ID to client
    socket.emit('user-id', userId);

    // Send existing users' locations
    const existingLocations = Object.entries(userLocations[roomId] || {}).map(
      ([uid, loc]) => ({
        userId: uid,
        lat: loc.lat,
        lng: loc.lng,
      })
    );
    socket.emit('existing-users', existingLocations);
  });

  socket.on('location-update', (data) => {
    const { roomId, userId } = socket;
    if (!roomId || !userId) return;

    if (!userLocations[roomId]) userLocations[roomId] = {};
    userLocations[roomId][userId] = data;

    socket.to(roomId).emit('location-update', { ...data, userId });
  });

  socket.on('disconnect', () => {
    const { roomId, userId } = socket;
    if (roomId && userId && userLocations[roomId]) {
      delete userLocations[roomId][userId];
      if (Object.keys(userLocations[roomId]).length === 0) {
        delete userLocations[roomId];
      }
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`CORS enabled for origin: ${NODE_ENV === 'production' ? process.env.CLIENT_URL : '*'}`);
});
