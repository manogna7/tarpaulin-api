const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Project = require('./projects');

const Requirement = sequelize.define('Requirement', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'courseId',
    references: {
      model: Project,
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
  },
  assignedUserId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'Assignments',
  timestamps: false
});

module.exports = Requirement;
