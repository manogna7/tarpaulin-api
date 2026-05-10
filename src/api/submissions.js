const { Router } = require('express');
const { Submission, Assignment, User } = require('../models'); // Import models from index file
const authenticateToken = require('../middleware/authenticator');
const authorizeRole = require('../middleware/authorization');

const router = Router();

/*
 * Route to update a specific Submission.
 * Only an authenticated User with 'admin' role or an authenticated 'instructor' User whose ID matches the `instructorId` of the associated course can update a Submission.
 */
router.patch('/:id', authenticateToken, async (req, res, next) => {
  const submissionId = req.params.id;
  const { grade } = req.body;

  try {
    const submission = await Submission.findByPk(submissionId, {
      include: {
        model: Assignment,
        as: 'assignment',
        include: {
          model: User,
          as: 'instructor'
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Specified Submission `id` not found.' });
    }

    if (req.user.role !== 'admin' && req.user.id !== submission.assignment.instructorId) {
      return res.status(403).json({ error: 'The request was not made by an authenticated User satisfying the authorization criteria described above.' });
    }

    if (grade !== undefined) {
      submission.grade = grade;
    }

    await submission.save();
    res.status(200).send(submission);
  } catch (e) {
    console.error("Error updating submission:", e);
    res.status(500).json({ error: "An error occurred while updating the submission." });
  }
});

/*
 * Route to download the file for a specific Submission.
 * Only an authenticated User with 'admin' role or an authenticated 'instructor' User whose ID matches the `instructorId` of the associated course can download the file.
 */
router.get('/media/submissions/:filename', authenticateToken, async (req, res, next) => {
  const { filename } = req.params;

  try {
    const submission = await Submission.findOne({
      where: { filename },
      include: {
        model: Assignment,
        as: 'assignment',
        include: {
          model: User,
          as: 'instructor'
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Specified Submission `filename` not found.' });
    }

    if (req.user.role !== 'admin' && req.user.id !== submission.assignment.instructorId) {
      return res.status(403).json({ error: 'The request was not made by an authenticated User satisfying the authorization criteria described above.' });
    }

    res.download(submission.path);
  } catch (e) {
    console.error("Error fetching submission file:", e);
    res.status(500).json({ error: "An error occurred while fetching the submission file." });
  }
});

module.exports = router;
