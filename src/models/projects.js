const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  term: {
    type: DataTypes.STRING,
    allowNull: false
  },
  leadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'instructorId'
  },
  projectCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  productDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active'
  }
}, {
  tableName: 'Courses',
  timestamps: false
});

module.exports = Project;
