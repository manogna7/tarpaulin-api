const { Router } = require('express');
const { ValidationError } = require('sequelize');
const { Course, User, Assignment } = require('../models'); // Import models from index file
const CourseEnrollments = require('../models/enrollments');
const authenticateToken = require('../middleware/authenticator');
const authorizeRole = require('../middleware/authorization');
const { Parser } = require('json2csv');

const router = Router();

/* Route to create a new course.
* Only an authenticated User with 'admin' role can create a new Course.
*/
router.post('/', authenticateToken, authorizeRole('admin'), async function (req, res, next) {
 try {
   const course = await Course.create(req.body);
   res.status(201).send({ id: course.id });
 } catch (e) {
   if (e instanceof ValidationError) {
     const errors = e.errors.map(err => err.message);
     res.status(400).json({ error: 'The request body did not contain a valid Course object.', details: errors });
   } else if (e instanceof UniqueConstraintError) {
     res.status(400).json({ error: 'A course with the given details already exists.' });
   } else if (e instanceof ForeignKeyConstraintError) {
     res.status(400).json({ error: 'The provided instructor ID does not exist.' });
   } else {
     console.error("Unexpected error:", e);
     res.status(500).json({ error: 'An unexpected error occurred while creating the course.' });
   }
 }
});

/*
 * Route to fetch the list of all courses (paginated).
 */
router.get('/', async function (req, res, next) {
  const { page = 1, pageSize = 10, subject, number, term } = req.query;
  const whereClause = {};

  if (subject) {
    whereClause.subject = subject;
  }
  if (number) {
    whereClause.number = number;
  }
  if (term) {
    whereClause.term = term;
  }

  try {
    const { count, rows } = await Course.findAndCountAll({
      where: whereClause,
      limit: parseInt(pageSize),
      offset: (parseInt(page) - 1) * parseInt(pageSize)
    });

    res.status(200).send({
      courses: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / pageSize),
      totalCourses: count
    });
  } catch (e) {
    console.error("Error fetching courses:", e);
    res.status(500).json({ error: "An error occurred while fetching courses." });
  }
});


/*
 * Route to fetch info about a specific course.
 */
router.get('/:courseId', async function (req, res, next) {
  const courseId = req.params.courseId;
  try {
    const course = await Course.findByPk(courseId);
    if (course) {
      res.status(200).send(course);
    } else {
      res.status(404).json({ error: 'Specified Course `id` not found.' });
    }
  } catch (e) {
    console.error("Error fetching course:", e);
    res.status(500).json({ error: "An error occurred while fetching the course." });
  }
});

/*
 * Route to update a course.
 */
router.patch('/:courseId', authenticateToken, async function (req, res, next) {
  const courseId = req.params.courseId;
  try {
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Specified Course `id` not found.' });
    }
    if (req.user.role !== 'admin' && req.user.id !== course.instructorId) {
      return res.status(403).json({ error: 'The request was not made by an authenticated User satisfying the authorization criteria described above.' });
    }
    const result = await Course.update(req.body, {
      where: { id: courseId }
    });
    if (result[0] > 0) {
      res.status(200).send(course);
    } else {
      res.status(400).json({ error: 'The request body was either not present or did not contain any fields related to Course objects.' });
    }
  } catch (e) {
    console.error("Error updating course:", e);
    res.status(500).json({ error: "An error occurred while updating the course." });
  }
});

/*
 * Route to delete a course.
 */
router.delete('/:courseId', authenticateToken, authorizeRole('admin'), async function (req, res, next) {
  const courseId = req.params.courseId;
  try {
    const result = await Course.destroy({ where: { id: courseId }});
    if (result > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Specified Course `id` not found.' });
    }
  } catch (e) {
    console.error("Error deleting course:", e);
    res.status(500).json({ error: "An error occurred while deleting the course." });
  }
});

/*
 * Route to update enrollment for a course.
 */
router.post('/:courseId/students', authenticateToken, async function (req, res, next) {
  const courseId = req.params.courseId;
  const { add, remove } = req.body;
  try {
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Specified Course `id` not found.' });
    }
    if (req.user.role !== 'admin' && req.user.id !== course.instructorId) {
      return res.status(403).json({ error: 'The request was not made by an authenticated User satisfying the authorization criteria described above.' });
    }
    if (!add && !remove) {
      return res.status(400).json({ error: 'The request body was either not present or did not contain the fields described above.' });
    }

    if (add && add.length > 0) {
      const enrollments = add.map((studentId) => ({ courseId, userId: studentId }));
      await CourseEnrollments.bulkCreate(enrollments);
    }
    if (remove && remove.length > 0) {
      await CourseEnrollments.destroy({ where: { courseId, userId: remove } });
    }

    res.status(200).send({ message: 'Enrollments updated' });
  } catch (e) {
    console.error("Error updating enrollments:", e);
    res.status(500).json({ error: "An error occurred while updating the enrollments." });
  }
});

 /*
 * Route to fetch the roster of a course in CSV format.
 */
router.get('/:courseId/students', authenticateToken, async function (req, res, next) {
  const courseId = req.params.courseId;
  try {
    const course = await Course.findByPk(courseId, {
      include: {
        model: User,
        as: 'enrolledStudents',
        attributes: ['id', 'name', 'role'],
        through: { attributes: [] } // exclude the through table attributes
      }
    });
    if (course) {
      if (req.user.role !== 'admin' && req.user.id !== course.instructorId) {
        return res.status(403).json({ error: 'The request was not made by an authenticated User satisfying the authorization criteria described above.' });
      }
      res.status(200).send(course.enrolledStudents);
    } else {
      res.status(404).json({ error: 'Specified Course `id` not found.' });
    }
  } catch (e) {
    console.error("Error fetching students:", e);
    res.status(500).json({ error: "An error occurred while fetching the students." });
  }
});

/*
 * Route to fetch the roster of a course in CSV format.
 */
router.get('/:courseId/roster', authenticateToken, async function (req, res, next) {
  const courseId = req.params.courseId;
  try {
    const course = await Course.findByPk(courseId, {
      include: {
        model: User,
        as: 'enrolledStudents',
        attributes: ['id', 'name'],
        through: { attributes: [] } // exclude the through table attributes
      }
    });
    if (course) {
      if (req.user.role !== 'admin' && req.user.id !== course.instructorId) {
        return res.status(403).json({ error: 'The request was not made by an authenticated User satisfying the authorization criteria described above.' });
      }
      const parser = new Parser({ fields: ['id', 'name'] });
      const csv = parser.parse(course.enrolledStudents);
      res.header('Content-Type', 'text/csv');
      res.attachment(`roster_course_${courseId}.csv`);
      res.status(200).send(csv);
    } else {
      res.status(404).json({ error: 'Specified Course `id` not found.' });
    }
  } catch (e) {
    console.error("Error fetching roster:", e);
    res.status(500).json({ error: "An error occurred while fetching the roster." });
  }
});

/*
 * Route to fetch assignments for a course.
 */
router.get('/:courseId/assignments', authenticateToken, async (req, res) => {
  const courseId = req.params.courseId;
  try {
    const course = await Course.findByPk(courseId, {
      include: {
        model: Assignment,
        as: 'assignments'
      }
    });
    if (course) {
      if (req.user.role !== 'admin' && req.user.id !== course.instructorId) {
        return res.status(403).json({ error: 'The request was not made by an authenticated User satisfying the authorization criteria described above.' });
      }
      res.status(200).send(course.assignments);
    } else {
      res.status(404).json({ error: 'Specified Course `id` not found.' });
    }
  } catch (e) {
    console.error("Error fetching assignments:", e);
    res.status(500).json({ error: "An error occurred while fetching assignments." });
  }
});

module.exports = router;