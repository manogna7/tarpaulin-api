const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const User = require('./users');
const Course = require('./courses');
const Assignment = require('./assignments');
const CourseEnrollments = require('./enrollments');
const Submission = require('./submissions');

// Define relationships
Course.belongsToMany(User, { through: CourseEnrollments, as: 'enrolledStudents', foreignKey: 'courseId' });
User.belongsToMany(Course, { through: CourseEnrollments, as: 'enrolledCourses', foreignKey: 'userId' });

Course.hasMany(Assignment, { as: 'assignments', foreignKey: 'courseId' });
Assignment.belongsTo(Course, { foreignKey: 'courseId' });

Course.belongsTo(User, { as: 'instructor', foreignKey: 'instructorId' });
User.hasMany(Course, { as: 'taughtCourses', foreignKey: 'instructorId' });

Assignment.hasMany(Submission, { as: 'submissions', foreignKey: 'assignmentId' });
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId' });

Submission.belongsTo(User, { as: 'student', foreignKey: 'studentId' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Course,
  Assignment,
  CourseEnrollments,
  Submission
};
