const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  res.json({ user: req.user });
});

router.put('/', auth, validate('profileUpdate'), async (req, res, next) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (name) {
      user.name = name;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      const match = await user.comparePassword(currentPassword);
      if (!match) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      user.password = newPassword;
    }

    await user.save();
    logger.info(`Profile updated: ${user.email}`);
    res.json({ user, message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
