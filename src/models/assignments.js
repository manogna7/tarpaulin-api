const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Course = require('./courses');

const Assignment = sequelize.define('Assignment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Course,
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  due: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  timestamps: false
});

module.exports = Assignment;
