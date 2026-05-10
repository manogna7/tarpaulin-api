const { Router } = require('express');
const { ValidationError } = require('sequelize');
const Assignment = require('../models/assignments');
const Course = require('../models/courses');
const Submission = require('../models/submissions');
const authenticateToken = require('../middleware/authenticator');
const authorizeRole = require('../middleware/authorization');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const filename = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
    cb(null, filename);
  }
});

const upload = multer({ storage });

/*
 * Route to create a new assignment.
 */
router.post('/', authenticateToken, authorizeRole('admin'), async function (req, res, next) {
  try {
    console.log('Request Body:', req.body); // Log the request body for debugging
    const assignment = await Assignment.create(req.body);
    res.status(201).send({ id: assignment.id });
  } catch (e) {
    console.error('Error:', e); // Log the exact error
    if (e instanceof ValidationError) {
      res.status(400).json({ error: 'The request body was either not present or did not contain a valid Assignment object.' });
    } else {
      res.status(500).json({ error: 'An internal server error occurred.' });
      next(e);
    }
  }
});

/*
 * Route to fetch info about a specific assignment.
 */
router.get('/:assignmentId', authenticateToken, async function (req, res, next) {
  const assignmentId = req.params.assignmentId;
  try {
    const assignment = await Assignment.findByPk(assignmentId);
    if (assignment) {
      res.status(200).send(assignment);
    } else {
      res.status(404).json({ error: 'Specified Assignment `id` not found.' });
    }
  } catch (e) {
    next(e);
  }
});

/*
 * Route to update an assignment.
 */
router.patch('/:assignmentId', authenticateToken, authorizeRole('admin'), async function (req, res, next) {
  const assignmentId = req.params.assignmentId;
  try {
    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Specified Assignment `id` not found.' });
    }
    await assignment.update(req.body);
    res.status(200).send(assignment);
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).json({ error: 'The request body was either not present or did not contain valid fields for the Assignment object.' });
    } else {
      next(e);
    }
  }
});

/*
 * Route to delete an assignment.
 */
router.delete('/:assignmentId', authenticateToken, authorizeRole('admin'), async function (req, res, next) {
  const assignmentId = req.params.assignmentId;
  try {
    const result = await Assignment.destroy({ where: { id: assignmentId } });
    if (result > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Specified Assignment `id` not found.' });
    }
  } catch (e) {
    next(e);
  }
});

/*
 * Route to fetch the list of all submissions for an assignment.
 */
router.get('/:id/submissions', authenticateToken, async function (req, res, next) {
  const assignmentId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const studentId = req.query.studentId;

  const limit = 10; // You can change this to the number of submissions per page
  const offset = (page - 1) * limit;

  const whereClause = { assignmentId };
  if (studentId) {
    whereClause.studentId = studentId;
  }

  try {
    const submissions = await Submission.findAndCountAll({
      where: whereClause,
      limit,
      offset
    });

    res.status(200).json({
      submissions: submissions.rows,
      total: submissions.count,
      page,
      pages: Math.ceil(submissions.count / limit)
    });
  } catch (e) {
    next(e);
  }
});

/*
 * Route to create a new submission for an assignment.
 */
router.post('/:id/submissions', authenticateToken, authorizeRole('student'), upload.single('file'), async function (req, res, next) {
  const assignmentId = req.params.id;

  // Only students enrolled in the course can submit
  try {
    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Specified Assignment id not found.' });
    }

    const course = await Course.findByPk(assignment.courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course for the specified Assignment not found.' });
    }

    const isEnrolled = await course.hasStudent(req.user.id); // Assuming this method checks enrollment
    if (!isEnrolled) {
      return res.status(403).json({ error: 'User is not enrolled in the Course for the specified Assignment.' });
    }

    const submissionData = {
      assignmentId,
      studentId: req.user.id,
      timestamp: new Date().toISOString(),
      contentType: req.file.mimetype,
      filename: req.file.filename,
      path: req.file.path
    };

    const submission = await Submission.create(submissionData);
    res.status(201).json({ id: submission.id });
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).json({ error: 'The request body was either not present or did not contain a valid Submission object.' });
    } else {
      next(e);
    }
  }
});

module.exports = router;
