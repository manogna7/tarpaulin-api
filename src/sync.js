const sequelize = require('./config/database');
const bcrypt = require('bcryptjs');

const { User, Course, Assignment, CourseEnrollments, Submission } = require('./models');

const userData = require('./data/users.json');
const courseData = require('./data/courses.json');
const enrollmentData = require('./data/enrollments.json');
const assignmentData = require('./data/assignments.json');
const submissionData = require('./data/submissions.json'); // Ensure this file exists with dummy data

// Define client fields for bulk creation
const UserClientFields = ['name', 'email', 'password', 'role'];
const CourseClientFields = ['id', 'subject', 'number', 'title', 'term', 'instructorId'];
const EnrollmentClientFields = ['courseId', 'userId'];
const AssignmentClientFields = ['id', 'courseId', 'title', 'description', 'points', 'due'];
const SubmissionClientFields = ['id', 'contentType', 'filename', 'path', 'assignmentId', 'studentId', 'timestamp', 'grade'];

const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synchronized successfully.');

    // Insert Users
    const users = userData.map(user => ({
      ...user,
      password: bcrypt.hashSync(user.password, 8)
    }));
    await User.bulkCreate(users, { fields: UserClientFields });

    // Insert Courses
    await Course.bulkCreate(courseData, { fields: CourseClientFields });

    // Insert Enrollments
    await CourseEnrollments.bulkCreate(enrollmentData, { fields: EnrollmentClientFields });

    // Insert Assignments
    await Assignment.bulkCreate(assignmentData, { fields: AssignmentClientFields });

    // Insert Submissions
    await Submission.bulkCreate(submissionData, { fields: SubmissionClientFields });

    console.log("Database initialized successfully.");
    process.exit(0); // Exit process after successful initialization
  } catch (error) {
    console.error('Error syncing database:', error);
    process.exit(1); // Exit process with error
  }
};

syncDatabase();
