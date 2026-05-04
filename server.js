/**
 * Eventra – Backend API Server
 * Tech: Node.js + Express + MongoDB (Mongoose)
 *
 * Auth Routes:
 *   POST   /register             – Register a new admin account
 *   POST   /login                – Login and receive a JWT token
 *
 * Booking Routes (protected by verifyToken middleware):
 *   POST   /add-booking          – Create a new booking (public)
 *   GET    /bookings             – Fetch all bookings (admin only)
 *   PUT    /update-booking/:id   – Update booking status (admin only)
 *   DELETE /delete-booking/:id   – Delete a booking (admin only)
 */

const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');

const app  = express();
const PORT = process.env.PORT || 3000;

// Secret key for signing JWTs — in production use a long random env variable
const JWT_SECRET = process.env.JWT_SECRET || 'eventra_super_secret_jwt_key_2025';

// ════════════════════════════════════════════
// Middleware
// ════════════════════════════════════════════
app.use(cors());
app.use(express.json());

// ════════════════════════════════════════════
// MongoDB Connection
// ════════════════════════════════════════════
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eventra';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ════════════════════════════════════════════
// User Schema & Model
// ════════════════════════════════════════════
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters']
    },
    password: {
      type: String,
      required: [true, 'Password is required']
    }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model('User', userSchema);

// ════════════════════════════════════════════
// Booking Schema & Model
// ════════════════════════════════════════════
const bookingSchema = new mongoose.Schema(
  {
    name:    { type: String, required: [true, 'Name is required'],  trim: true, maxlength: 100 },
    email:   { type: String, required: [true, 'Email is required'], trim: true, lowercase: true, match: [/\S+@\S+\.\S+/, 'Invalid email'] },
    event:   { type: String, required: [true, 'Event is required'], trim: true },
    date:    { type: String, required: [true, 'Date is required']  },
    slot:    { type: String, required: [true, 'Slot is required'],  enum: { values: ['Morning','Evening'], message: 'Slot must be Morning or Evening' } },
    message: { type: String, trim: true, default: '', maxlength: 500 },
    status:  { type: String, enum: ['Registered','Confirmed','Attended'], default: 'Registered' }
  },
  { timestamps: true }
);

const Booking = mongoose.model('Booking', bookingSchema);

// ════════════════════════════════════════════
// JWT Auth Middleware
// ════════════════════════════════════════════
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) return res.status(401).json({ message: 'Access denied. Please log in.' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token. Please log in again.' });
  }
}

// ════════════════════════════════════════════
// Routes
// ════════════════════════════════════════════

app.get('/', (req, res) => {
  res.json({ message: 'Eventra API is running 🎉', status: 'ok' });
});

/**
 * Register a new admin account
 * POST /register
 * Body: { username, password }
 */
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: 'Username and password are required.' });
    if (username.trim().length < 3)
      return res.status(400).json({ message: 'Username must be at least 3 characters.' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const existing = await User.findOne({ username: username.trim().toLowerCase() });
    if (existing)
      return res.status(409).json({ message: 'Username already taken. Please choose another.' });

    const user = await User.create({ username: username.trim().toLowerCase(), password });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'Account created successfully!', token, username: user.username });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: 'Username already taken.' });
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    console.error('POST /register error:', err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

/**
 * Login
 * POST /login
 * Body: { username, password }
 */
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: 'Username and password are required.' });

    const user = await User.findOne({ username: username.trim().toLowerCase() });
    if (!user)
      return res.status(401).json({ message: 'Invalid username or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid username or password.' });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: 'Login successful!', token, username: user.username });
  } catch (err) {
    console.error('POST /login error:', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

/**
 * Create a booking (public — no token needed)
 * POST /add-booking
 */
app.post('/add-booking', async (req, res) => {
  try {
    const { name, email, event, date, slot, message } = req.body;

    if (!name || !email || !event || !date || !slot)
      return res.status(400).json({ message: 'Please fill in all required fields.' });

    const booking = await Booking.create({ name, email, event, date, slot, message });
    res.status(201).json({ message: 'Booking created successfully!', booking });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    console.error('POST /add-booking error:', err);
    res.status(500).json({ message: 'Internal server error. Please try again.' });
  }
});

/**
 * Get all bookings — admin only
 * GET /bookings
 */
app.get('/bookings', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error('GET /bookings error:', err);
    res.status(500).json({ message: 'Failed to fetch bookings.' });
  }
});

/**
 * Update booking status — admin only
 * PUT /update-booking/:id
 */
app.put('/update-booking/:id', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Registered', 'Confirmed', 'Attended'];
    if (!allowed.includes(status))
      return res.status(400).json({ message: 'Invalid status value.' });

    const booking = await Booking.findByIdAndUpdate(
      req.params.id, { status }, { new: true, runValidators: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    res.json({ message: 'Status updated successfully.', booking });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid booking ID.' });
    console.error('PUT /update-booking error:', err);
    res.status(500).json({ message: 'Failed to update booking.' });
  }
});

/**
 * Delete a booking — admin only
 * DELETE /delete-booking/:id
 */
app.delete('/delete-booking/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    res.json({ message: 'Booking deleted successfully.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid booking ID.' });
    console.error('DELETE /delete-booking error:', err);
    res.status(500).json({ message: 'Failed to delete booking.' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found.` });
});

app.listen(PORT, () => {
  console.log(`🚀 Eventra API running at http://localhost:${PORT}`);
});
