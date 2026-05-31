const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const sequelize = require('./config/database');
const { User, Project, Requirement, ProjectMembership, Evidence } = require('./models');
const { uploadDir } = require('./utils/uploads');

const users = require('./data/users.json');
const projects = require('./data/projects.json');
const requirements = require('./data/requirements.json');
const memberships = require('./data/project-memberships.json');
const evidence = require('./data/evidence.json');

const userFields = ['id', 'name', 'email', 'password', 'role'];
const projectFields = [
  'id',
  'subject',
  'number',
  'title',
  'term',
  'leadId',
  'projectCode',
  'productDescription',
  'dueDate',
  'status'
];
const membershipFields = ['projectId', 'userId', 'projectRole'];
const requirementFields = [
  'id',
  'projectId',
  'title',
  'description',
  'points',
  'due',
  'assignedUserId'
];
const evidenceFields = [
  'id',
  'contentType',
  'filename',
  'path',
  'requirementId',
  'contributorId',
  'timestamp',
  'reviewDecision',
  'reviewNotes',
  'reviewedAt',
  'reviewerId'
];

function ensureSeedFiles() {
  fs.mkdirSync(uploadDir, { recursive: true });

  return evidence.map((item) => {
    const filePath = path.join(uploadDir, item.filename);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        [
          `Tarpaulin demo evidence: ${item.filename}`,
          `Requirement ID: ${item.requirementId}`,
          `Submitted by user ID: ${item.contributorId}`,
          '',
          'This seeded file exists so protected downloads work in the local demo.',
        ].join('\n')
      );
    }

    return {
      ...item,
      path: filePath,
    };
  });
}

async function resetDatabase() {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synchronized successfully.');

    await User.bulkCreate(
      users.map((user) => ({
        ...user,
        password: bcrypt.hashSync(user.password, 8),
      })),
      { fields: userFields }
    );

    await Project.bulkCreate(projects, { fields: projectFields });
    await ProjectMembership.bulkCreate(memberships, { fields: membershipFields });
    await Requirement.bulkCreate(requirements, { fields: requirementFields });
    await Evidence.bulkCreate(ensureSeedFiles(), { fields: evidenceFields });

    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error syncing database:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

resetDatabase();
