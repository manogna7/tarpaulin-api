const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CourseEnrollments = sequelize.define('CourseEnrollments', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: false
});

module.exports = CourseEnrollments;
