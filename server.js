require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const { RedisStore } = require('rate-limit-redis');

const api = require('./src/api');
const sequelize = require('./src/config/database');

const app = express();
const port = process.env.PORT || 3000;

// Request logger
app.use(morgan('dev'));

// Middleware to parse JSON
app.use(express.json());

// Configure Redis client
const redisClient = new Redis({
  host: 'redis',
  port: 6379
});

redisClient.on('error', (err) => {
  console.log('Redis error: ', err);
});

// Rate limiting for unauthenticated users
const unauthenticatedLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many requests from this IP, please try again after a minute'
});

// Rate limiting for authenticated users
const authenticatedLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many requests, please try again after a minute'
});

// Middleware to apply rate limiting based on authentication
app.use((req, res, next) => {
  const authHeader = req.get("Authorization") || "";
  const token = authHeader.split(" ")[1];
  if (token) {
    authenticatedLimiter(req, res, next);
  } else {
    unauthenticatedLimiter(req, res, next);
  }
});

// API routes
app.use('/', api);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).send({
    error: `Requested resource "${req.originalUrl}" does not exist`
  });
});

// Error handler
app.use('*', (err, req, res, next) => {
  console.error("== Error:", err);
  res.status(500).send({
    error: "Server error. Please try again later."
  });
});

// Establish connection to the database and start the server
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

startServer();
