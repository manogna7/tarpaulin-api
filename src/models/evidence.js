const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Requirement = require('./requirements');
const User = require('./users');

const Evidence = sequelize.define('Evidence', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  requirementId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'assignmentId',
    references: {
      model: Requirement,
      key: 'id'
    }
  },
  contributorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'studentId',
    references: {
      model: User,
      key: 'id'
    }
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contentType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reviewDecision: {
    type: DataTypes.ENUM('submitted', 'in_review', 'approved', 'needs_changes', 'rejected', 'blocked'),
    allowNull: true
  },
  reviewNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reviewerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  tableName: 'Submissions',
  timestamps: false
});

module.exports = Evidence;
