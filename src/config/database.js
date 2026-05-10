const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  pool: {
    max: 10,       // Maximum number of connections in the pool
    min: 0,        // Minimum number of connections in the pool
    acquire: 30000, // Maximum time (ms) to try to get a connection before throwing an error
    idle: 10000    // Maximum time (ms) a connection can be idle before being released
  },
  retry: {
    max: 5, // Maximum number of retries
    match: [
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /ECONNRESET/,
      /ECONNREFUSED/
    ]
  }
});

const connectWithRetry = async () => {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
      return;
    } catch (err) {
      console.error(`Attempt ${attempt}: Unable to connect to the database:`, err);
      if (attempt === 5) {
        throw err;
      }
      console.log('Retrying in 5 seconds...');
      await new Promise(res => setTimeout(res, 5000)); // Wait for 5 seconds before retrying
    }
  }
};

connectWithRetry();

module.exports = sequelize;
