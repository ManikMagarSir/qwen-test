require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const instanceRoutes = require('./routes/instances');
const templateRoutes = require('./routes/templates');
const { initPool } = require('./services/ipam');
const { setupConsole } = require('./console');
const { setupMonitor } = require('./monitor');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/templates', templateRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await initPool();
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on 0.0.0.0:${PORT}`);
  });
  setupConsole(server);
  setupMonitor(server);
  console.log('Console WebSocket ready');
  console.log('Monitor WebSocket ready');
});
