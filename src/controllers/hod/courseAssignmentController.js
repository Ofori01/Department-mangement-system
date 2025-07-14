import { CourseAssignment, Course, User } from "../../models/index.js";

// Assign lecturer to course
export const assignLecturerToCourse = async (req, res) => {
  try {
    const { course_id, lecturer_id } = req.body;

    // Extract department ID from populated object
    const userDepartmentId = req.user.department_id._id
      ? req.user.department_id._id.toString()
      : req.user.department_id.toString();

    console.log("User department ID:", userDepartmentId);

    // Verify course belongs to HoD's department
    const course = await Course.findOne({
      _id: course_id,
      department_id: userDepartmentId,
    });

    if (!course) {
      return res
        .status(404)
        .json({ message: "Course not found or not in your department" });
    }

    // Verify lecturer exists and is in the same department
    const lecturer = await User.findOne({
      _id: lecturer_id,
      role: "Lecturer",
      department_id: userDepartmentId,
    });

    if (!lecturer) {
      return res
        .status(404)
        .json({ message: "Lecturer not found or not in your department" });
    }

    // Check if assignment already exists
    const existingAssignment = await CourseAssignment.findOne({
      course_id,
      lecturer_id,
    });

    if (existingAssignment) {
      return res
        .status(400)
        .json({ message: "Lecturer already assigned to this course" });
    }

    const assignment = new CourseAssignment({
      course_id,
      lecturer_id,
    });

    await assignment.save();
    await assignment.populate("course_id lecturer_id", "title code name email");

    res.status(201).json({
      message: "Lecturer assigned to course successfully",
      assignment,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get course assignments for HoD's department
export const getCourseAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 10, course_id } = req.query;

    // Extract department ID from populated object
    const userDepartmentId = req.user.department_id._id
      ? req.user.department_id._id.toString()
      : req.user.department_id.toString();

    // Build filter for courses in HoD's department
    const courseFilter = { department_id: userDepartmentId };
    if (course_id) courseFilter._id = course_id;

    const departmentCourses = await Course.find(courseFilter).select("_id");
    const courseIds = departmentCourses.map((course) => course._id);

    const filter = { course_id: { $in: courseIds } };

    const assignments = await CourseAssignment.find(filter)
      .populate("course_id", "title code level semester")
      .populate("lecturer_id", "name email")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await CourseAssignment.countDocuments(filter);

    res.json({
      assignments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove lecturer from course
export const removeLecturerFromCourse = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Extract department ID from populated object
    const userDepartmentId = req.user.department_id._id
      ? req.user.department_id._id.toString()
      : req.user.department_id.toString();

    const assignment = await CourseAssignment.findById(assignmentId).populate(
      "course_id"
    );

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Verify course belongs to HoD's department
    const courseDepartmentId = assignment.course_id.department_id._id
      ? assignment.course_id.department_id._id.toString()
      : assignment.course_id.department_id.toString();

    if (courseDepartmentId !== userDepartmentId) {
      return res.status(403).json({
        message: "You can only manage assignments in your department",
      });
    }

    await CourseAssignment.findByIdAndDelete(assignmentId);

    res.json({ message: "Lecturer removed from course successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get available lecturers in department
export const getAvailableLecturers = async (req, res) => {
  try {
    const { course_id } = req.query;

    // Extract department ID from populated object
    const userDepartmentId = req.user.department_id._id
      ? req.user.department_id._id.toString()
      : req.user.department_id.toString();

    // Get all lecturers in the department
    const allLecturers = await User.find({
      role: "Lecturer",
      department_id: userDepartmentId,
    }).select("name email");

    if (course_id) {
      // Get lecturers already assigned to this course
      const assignedLecturers = await CourseAssignment.find({ course_id })
        .populate("lecturer_id")
        .select("lecturer_id");

      const assignedIds = assignedLecturers.map((assignment) =>
        assignment.lecturer_id._id.toString()
      );

      // Filter out already assigned lecturers
      const availableLecturers = allLecturers.filter(
        (lecturer) => !assignedIds.includes(lecturer._id.toString())
      );

      return res.json({ lecturers: availableLecturers });
    }

    res.json({ lecturers: allLecturers });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
