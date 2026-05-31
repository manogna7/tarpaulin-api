const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProjectMembership = sequelize.define('ProjectMembership', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'courseId'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  projectRole: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'contributor'
  }
}, {
  tableName: 'CourseEnrollments',
  timestamps: false
});

module.exports = ProjectMembership;
