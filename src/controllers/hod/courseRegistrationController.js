import { CourseRegistration, Course, User } from "../../models/index.js";

// Register student to course
export const registerStudentToCourse = async (req, res) => {
  try {
    const { course_id, student_id } = req.body;

    // Verify course belongs to HoD's department
    const course = await Course.findOne({
      _id: course_id,
      department_id: req.user.department_id,
    });

    if (!course) {
      return res
        .status(404)
        .json({ message: "Course not found or not in your department" });
    }

    // Verify student exists and is in the same department
    const student = await User.findOne({
      _id: student_id,
      role: "Student",
      department_id: req.user.department_id,
    });

    if (!student) {
      return res
        .status(404)
        .json({ message: "Student not found or not in your department" });
    }

    // Check if registration already exists
    const existingRegistration = await CourseRegistration.findOne({
      course_id,
      student_id,
    });

    if (existingRegistration) {
      return res
        .status(400)
        .json({ message: "Student already registered for this course" });
    }

    const registration = new CourseRegistration({
      course_id,
      student_id,
    });

    await registration.save();
    await registration.populate(
      "course_id student_id",
      "title code name email studentId"
    );

    res.status(201).json({
      message: "Student registered to course successfully",
      registration,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Bulk register students to course
export const bulkRegisterStudents = async (req, res) => {
  try {
    const { course_id, student_ids } = req.body;

    // Verify course belongs to HoD's department
    const course = await Course.findOne({
      _id: course_id,
      department_id: req.user.department_id,
    });

    if (!course) {
      return res
        .status(404)
        .json({ message: "Course not found or not in your department" });
    }

    // Verify all students exist and are in the same department
    const students = await User.find({
      _id: { $in: student_ids },
      role: "Student",
      department_id: req.user.department_id,
    });

    if (students.length !== student_ids.length) {
      return res
        .status(400)
        .json({ message: "Some students not found or not in your department" });
    }

    // Get existing registrations to avoid duplicates
    const existingRegistrations = await CourseRegistration.find({
      course_id,
      student_id: { $in: student_ids },
    });

    const existingStudentIds = existingRegistrations.map((reg) =>
      reg.student_id.toString()
    );
    const newStudentIds = student_ids.filter(
      (id) => !existingStudentIds.includes(id)
    );

    if (newStudentIds.length === 0) {
      return res
        .status(400)
        .json({
          message: "All students are already registered for this course",
        });
    }

    // Create new registrations
    const registrations = newStudentIds.map((student_id) => ({
      course_id,
      student_id,
    }));

    const savedRegistrations = await CourseRegistration.insertMany(
      registrations
    );

    res.status(201).json({
      message: `${savedRegistrations.length} students registered successfully`,
      registrations: savedRegistrations.length,
      alreadyRegistered: existingStudentIds.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get course registrations for HoD's department
export const getCourseRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 10, course_id, level } = req.query;

    // Build filter for courses in HoD's department
    const courseFilter = { department_id: req.user.department_id };
    if (course_id) courseFilter._id = course_id;
    if (level) courseFilter.level = level;

    const departmentCourses = await Course.find(courseFilter).select("_id");
    const courseIds = departmentCourses.map((course) => course._id);

    const filter = { course_id: { $in: courseIds } };

    const registrations = await CourseRegistration.find(filter)
      .populate("course_id", "title code level semester")
      .populate("student_id", "name email studentId level")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await CourseRegistration.countDocuments(filter);

    res.json({
      registrations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove student from course
export const removeStudentFromCourse = async (req, res) => {
  try {
    const { registrationId } = req.params;

    const registration = await CourseRegistration.findById(
      registrationId
    ).populate("course_id");

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    // Verify course belongs to HoD's department
    if (
      registration.course_id.department_id.toString() !==
      req.user.department_id.toString()
    ) {
      return res
        .status(403)
        .json({
          message: "You can only manage registrations in your department",
        });
    }

    await CourseRegistration.findByIdAndDelete(registrationId);

    res.json({ message: "Student removed from course successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get available students for course registration
export const getAvailableStudents = async (req, res) => {
  try {
    const { course_id, level } = req.query;

    // Build filter for students in the department
    const studentFilter = {
      role: "Student",
      department_id: req.user.department_id,
    };

    if (level) studentFilter.level = level;

    // Get all students in the department (optionally filtered by level)
    const allStudents = await User.find(studentFilter).select(
      "name email studentId level"
    );

    if (course_id) {
      // Get students already registered for this course
      const registeredStudents = await CourseRegistration.find({ course_id })
        .populate("student_id")
        .select("student_id");

      const registeredIds = registeredStudents.map((reg) =>
        reg.student_id._id.toString()
      );

      // Filter out already registered students
      const availableStudents = allStudents.filter(
        (student) => !registeredIds.includes(student._id.toString())
      );

      return res.json({ students: availableStudents });
    }

    res.json({ students: allStudents });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
