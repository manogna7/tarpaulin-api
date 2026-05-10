const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Assignment = require('./assignments');
const User = require('./users');

const Submission = sequelize.define('Submission', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  assignmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Assignment,
      key: 'id'
    }
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  },
  grade: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: false
});

module.exports = Submission;
