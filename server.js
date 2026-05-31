require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const { RedisStore } = require('rate-limit-redis');
const jwt = require('jsonwebtoken');

const api = require('./src/api');
const sequelize = require('./src/config/database');
const { connectWithRetry } = require('./src/config/database');
const { uploadDir } = require('./src/utils/uploads');

const app = express();
const port = process.env.PORT || 3000;
const unauthenticatedRateLimitMax = Number(process.env.UNAUTHENTICATED_RATE_LIMIT_MAX || 60);
const authenticatedRateLimitMax = Number(process.env.AUTHENTICATED_RATE_LIMIT_MAX || 120);

// Request logger
app.use(morgan('dev'));

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3001',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON
app.use(express.json());

// Configure Redis client
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379
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
  max: unauthenticatedRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests. Please wait a minute and try again.',
    });
  },
});

// Rate limiting for authenticated users
const authenticatedLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: authenticatedRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const authHeader = req.get('Authorization') || '';
    const token = authHeader.split(' ')[1];

    if (!token) {
      return 'authenticated:missing-token';
    }

    try {
      const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      return `user:${user.id}`;
    } catch {
      return `token:${token}`;
    }
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests. Please wait a minute and try again.',
    });
  },
});

// Middleware to apply rate limiting based on authentication
app.use((req, res, next) => {
  if (req.path === '/health' || req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.get("Authorization") || "";
  const token = authHeader.split(" ")[1];
  if (token) {
    authenticatedLimiter(req, res, next);
  } else {
    unauthenticatedLimiter(req, res, next);
  }
});

// API routes
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    uploads: uploadDir,
    services: {
      database: 'unknown',
      redis: redisClient.status,
    },
  };

  try {
    await sequelize.authenticate();
    health.services.database = 'ok';
  } catch (err) {
    health.status = 'degraded';
    health.services.database = 'error';
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

app.use('/', api);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).send({
    error: `Requested resource "${req.originalUrl}" does not exist`
  });
});

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    console.error('== Error:', err);
  }

  res.status(status).send({
    error: status === 400 ? 'Invalid request body.' : 'Server error. Please try again later.'
  });
});

// Establish connection to the database and start the server
const startServer = async () => {
  try {
    await connectWithRetry();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

startServer();
