import { Course } from "../../models/index.js";
import { CourseAssignment, CourseRegistration } from "../../models/index.js";
import { User } from "../../models/index.js";

// Create a new course
export const createCourse = async (req, res) => {
  try {
    const { title, code, level, semester, department_id } = req.body;

    // Check if course code already exists
    const existingCourse = await Course.findOne({ code: code.toUpperCase() });
    if (existingCourse) {
      return res.status(400).json({ message: "Course code already exists" });
    }

    // Ensure HoD can only create courses for their department
    const userDepartmentId = req.user.department_id._id
      ? req.user.department_id._id.toString()
      : req.user.department_id.toString();

    

    if (req.user.role === "HoD" && department_id !== userDepartmentId) {
      return res
        .status(403)
        .json({ message: "You can only create courses for your department" });
    }

    const course = new Course({
      title,
      code: code.toUpperCase(),
      level,
      semester,
      department_id: department_id || req.user.department_id,
      hod_id: req.user._id,
    });

    await course.save();
    await course.populate("department_id hod_id");

    res.status(201).json({
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all courses for HoD's department
export const getCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, level, semester } = req.query;

    const filter = { department_id: req.user.department_id };
    if (level) filter.level = level;
    if (semester) filter.semester = semester;

    const courses = await Course.find(filter)
      .populate("department_id hod_id", "name email")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(filter);

    res.json({
      courses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update course
export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const updates = req.body;

    const course = await Course.findOne({
      _id: courseId,
      department_id: req.user.department_id,
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check if new code conflicts with existing courses
    if (updates.code && updates.code !== course.code) {
      const existingCourse = await Course.findOne({
        code: updates.code.toUpperCase(),
        _id: { $ne: courseId },
      });
      if (existingCourse) {
        return res.status(400).json({ message: "Course code already exists" });
      }
      updates.code = updates.code.toUpperCase();
    }

    Object.assign(course, updates);
    await course.save();
    await course.populate("department_id hod_id");

    res.json({
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete course
export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findOne({
      _id: courseId,
      department_id: req.user.department_id,
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check if course has assignments or registrations
    const [assignments, registrations] = await Promise.all([
      CourseAssignment.countDocuments({ course_id: courseId }),
      CourseRegistration.countDocuments({ course_id: courseId }),
    ]);

    if (assignments > 0 || registrations > 0) {
      return res.status(400).json({
        message:
          "Cannot delete course with existing assignments or registrations",
      });
    }

    await Course.findByIdAndDelete(courseId);

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
