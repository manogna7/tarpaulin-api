const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const User = require('./users');
const Project = require('./projects');
const Requirement = require('./requirements');
const ProjectMembership = require('./project-memberships');
const Evidence = require('./evidence');

Project.belongsToMany(User, {
  through: ProjectMembership,
  as: 'members',
  foreignKey: { name: 'projectId', field: 'courseId' },
  otherKey: 'userId',
});
User.belongsToMany(Project, {
  through: ProjectMembership,
  as: 'projects',
  foreignKey: 'userId',
  otherKey: { name: 'projectId', field: 'courseId' },
});

Project.hasMany(Requirement, {
  as: 'requirements',
  foreignKey: { name: 'projectId', field: 'courseId' },
});
Requirement.belongsTo(Project, {
  as: 'project',
  foreignKey: { name: 'projectId', field: 'courseId' },
});

Project.belongsTo(User, {
  as: 'lead',
  foreignKey: { name: 'leadId', field: 'instructorId' },
});
User.hasMany(Project, {
  as: 'ledProjects',
  foreignKey: { name: 'leadId', field: 'instructorId' },
});

Requirement.hasMany(Evidence, {
  as: 'evidence',
  foreignKey: { name: 'requirementId', field: 'assignmentId' },
});
Evidence.belongsTo(Requirement, {
  as: 'requirement',
  foreignKey: { name: 'requirementId', field: 'assignmentId' },
});

Evidence.belongsTo(User, {
  as: 'contributor',
  foreignKey: { name: 'contributorId', field: 'studentId' },
});
Requirement.belongsTo(User, { as: 'assignedContributor', foreignKey: 'assignedUserId' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Project,
  Requirement,
  ProjectMembership,
  Evidence
};
