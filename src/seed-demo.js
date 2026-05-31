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

function ensureSeedFile(item) {
  fs.mkdirSync(uploadDir, { recursive: true });

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

  return filePath;
}

async function upsertDemoData() {
  await sequelize.authenticate();

  for (const user of users) {
    const existingUser = await User.findByPk(user.id);

    if (existingUser) {
      await existingUser.update({
        name: user.name,
        email: user.email,
        password: bcrypt.hashSync(user.password, 8),
        role: user.role,
      });
      continue;
    }

    await User.create({
      ...user,
      password: bcrypt.hashSync(user.password, 8),
    });
  }

  for (const project of projects) {
    await Project.upsert(project);
  }

  for (const requirement of requirements) {
    await Requirement.upsert(requirement);
  }

  for (const membershipData of memberships) {
    const [membership] = await ProjectMembership.findOrCreate({
      where: {
        projectId: membershipData.projectId,
        userId: membershipData.userId,
      },
      defaults: membershipData,
    });

    if (membershipData.projectRole && membership.projectRole !== membershipData.projectRole) {
      await membership.update({ projectRole: membershipData.projectRole });
    }
  }

  for (const item of evidence) {
    const seededEvidence = {
      ...item,
      path: ensureSeedFile(item),
    };

    const existingEvidence = await Evidence.findByPk(item.id);

    if (existingEvidence) {
      await existingEvidence.update(seededEvidence);
      continue;
    }

    await Evidence.create(seededEvidence);
  }

  console.log('Demo data seeded safely.');
  console.log(`Upload directory ready: ${uploadDir}`);
}

upsertDemoData()
  .catch((err) => {
    console.error('Demo seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
