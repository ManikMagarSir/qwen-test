const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const logger = require('../utils/logger');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later' },
});

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

router.post('/register', authLimiter, validate('register'), async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const user = await User.create({ email, password, name });
    const token = signToken(user);
    logger.info(`User registered: ${user.email}`);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, validate('login'), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isLocked()) {
      const remain = Math.ceil((user.lockUntil - new Date()) / 60000);
      return res.status(429).json({ error: `Account locked. Try again in ${remain} minute(s)` });
    }

    if (!(await user.comparePassword(password))) {
      await user.incrementLoginAttempts();
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await user.resetLoginAttempts();
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

router.post('/refresh', auth, async (req, res) => {
  const token = signToken(req.user);
  res.json({ token });
});

module.exports = router;
