import studentModel from '../../models/student.js';
import StudentModel from '../../models/student.js';

// Get all students
export async function getStudents(req, res) {
  try {
    const students = await studentModel.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get single student by ID
export async function getStudent(req, res) {
  try {
    const student = await studentModel.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create a new student
export async function createStudent(req, res) {
  try {
    const student = await studentModel.create(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Update student by ID
export async function updateStudent(req, res) {
  try {
    const student = await studentModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Delete student by ID
export async function deleteStudent(req, res) {
  try {
    const student = await studentModel.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// get available courses
export async function getAvailableCourses(req, res) {
  try {
    const { department, semester } = req.query;
    if (!department || !semester) {
      return res.status(400).json({ error: 'Department and semester are required' });
    }

    const courses = await studentModel.find({
      departments: department,
      semester: semester
    });

    if (courses.length === 0) {
      return res.status(404).json({ message: 'No courses found for the specified department and semester' });
    }

    res.send(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({message: "something went wrong while fetching courses", error: err.message});
  }
}