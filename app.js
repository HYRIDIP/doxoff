const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// Track online users
const onlineUsers = new Map();
const ONLINE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Middleware to track online users
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  onlineUsers.set(ip, {
    ip: ip,
    lastSeen: Date.now(),
    userAgent: req.get('User-Agent') || 'Unknown'
  });
  next();
});

// Clean up old online users periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of onlineUsers.entries()) {
    if (now - data.lastSeen > ONLINE_TIMEOUT) {
      onlineUsers.delete(ip);
    }
  }
}, 60000); // Clean every minute

// Make online users available to all routes
app.use((req, res, next) => {
  res.locals.onlineUsersCount = onlineUsers.size;
  next();
});

// Database setup
const db = new sqlite3.Database('./database/pastebin.db');

// Session configuration
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user data available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Import routes
const homepageRoutes = require('./routes/homepage');
const loginRoutes = require('./routes/login');
const signupRoutes = require('./routes/signup');
const dashboardRoutes = require('./routes/dashboard');
const newpasteRoutes = require('./routes/newpaste');
const viewpasteRoutes = require('./routes/viewpaste');
const profileRoutes = require('./routes/profile');
const usersRoutes = require('./routes/users');
const searchRoutes = require('./routes/search');
const adminRoutes = require('./routes/admin');
const upgradesRoutes = require('./routes/upgrades');

// Use routes
app.use('/', homepageRoutes);
app.use('/', loginRoutes);
app.use('/', signupRoutes);
app.use('/', dashboardRoutes);
app.use('/', newpasteRoutes);
app.use('/', viewpasteRoutes);
app.use('/', profileRoutes);
app.use('/', usersRoutes);
app.use('/', searchRoutes);
app.use('/', adminRoutes);
app.use('/', upgradesRoutes);

// Online users API endpoint
app.get('/api/online-users', (req, res) => {
  const onlineCount = onlineUsers.size;
  res.json({ count: onlineCount, users: Array.from(onlineUsers.values()) });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
