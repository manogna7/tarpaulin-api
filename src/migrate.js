const { DataTypes } = require('sequelize');
const sequelize = require('./config/database');
const { uploadDir } = require('./utils/uploads');

async function addColumnIfMissing(queryInterface, tableDefinition, tableName, columnName, definition) {
  if (!tableDefinition[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
    console.log(`Added ${tableName}.${columnName}`);
  }
}

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  await sequelize.authenticate();

  // The product model uses project language, while these table names preserve
  // compatibility with the original local database.
  const projectTable = await queryInterface.describeTable('Courses');
  const requirementTable = await queryInterface.describeTable('Assignments');
  const membershipTable = await queryInterface.describeTable('CourseEnrollments');
  const evidenceTable = await queryInterface.describeTable('Submissions');

  await addColumnIfMissing(queryInterface, projectTable, 'Courses', 'projectCode', {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  });

  await addColumnIfMissing(queryInterface, projectTable, 'Courses', 'productDescription', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await addColumnIfMissing(queryInterface, projectTable, 'Courses', 'dueDate', {
    type: DataTypes.DATE,
    allowNull: true,
  });

  await addColumnIfMissing(queryInterface, projectTable, 'Courses', 'status', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active',
  });

  await addColumnIfMissing(queryInterface, requirementTable, 'Assignments', 'assignedUserId', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await addColumnIfMissing(queryInterface, membershipTable, 'CourseEnrollments', 'projectRole', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'contributor',
  });

  await addColumnIfMissing(queryInterface, evidenceTable, 'Submissions', 'contentType', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await addColumnIfMissing(queryInterface, evidenceTable, 'Submissions', 'reviewDecision', {
    type: DataTypes.ENUM('submitted', 'in_review', 'approved', 'needs_changes', 'rejected', 'blocked'),
    allowNull: true,
  });

  await addColumnIfMissing(queryInterface, evidenceTable, 'Submissions', 'reviewNotes', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await addColumnIfMissing(queryInterface, evidenceTable, 'Submissions', 'reviewedAt', {
    type: DataTypes.DATE,
    allowNull: true,
  });

  await addColumnIfMissing(queryInterface, evidenceTable, 'Submissions', 'reviewerId', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  console.log(`Upload directory ready: ${uploadDir}`);
  console.log('Database migration complete.');
}

migrate()
  .catch((err) => {
    console.error('Database migration failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
