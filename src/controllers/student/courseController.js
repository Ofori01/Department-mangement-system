import {
  CourseRegistration,
  Course,
  CourseAssignment,
} from "../../models/index.js";

// Register for a course (student self-registration)
export const registerForCourse = async (req, res) => {
  try {
    const { course_id } = req.body;

    // First, verify the course exists
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    // Find the course assignment for this student's department and level
    const courseAssignment = await CourseAssignment.findOne({
      course_id: course_id,
      department_id: req.user.department_id,
      level: req.user.level,
    })
      .populate("course_id", "title code credit_hours")
      .populate("lecturer_id", "name email");

    if (!courseAssignment) {
      return res.status(404).json({
        message:
          "Course assignment not found for your department and level. This course may not be available for your current academic level.",
      });
    }

    // Check if already registered
    const existingRegistration = await CourseRegistration.findOne({
      course_id,
      student_id: req.user._id,
    });

    if (existingRegistration) {
      return res
        .status(400)
        .json({ message: "Already registered for this course" });
    }

    const registration = new CourseRegistration({
      course_id,
      student_id: req.user._id,
    });

    await registration.save();
    await registration.populate("course_id", "title code credit_hours");

    res.status(201).json({
      message: "Successfully registered for course",
      registration: {
        ...registration.toObject(),
        assignment: {
          level: courseAssignment.level,
          semester: courseAssignment.semester,
          lecturer: courseAssignment.lecturer_id,
          assignment_id: courseAssignment._id,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get student's registered courses
export const getRegisteredCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, semester } = req.query;

    const registrations = await CourseRegistration.find({
      student_id: req.user._id,
    })
      .populate({
        path: "course_id",
        populate: [
          { path: "department_id", select: "name code" },
          { path: "hod_id", select: "name email" },
        ],
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Filter out registrations where course is null (in case of deleted courses)
    const validRegistrations = registrations.filter(
      (reg) => reg.course_id !== null
    );

    // Get assignment details for each registered course
    const registrationsWithAssignments = await Promise.all(
      validRegistrations.map(async (registration) => {
        const assignmentFilter = {
          course_id: registration.course_id._id,
          department_id: req.user.department_id,
          level: req.user.level, // Always use the student's current level
        };

        // Add semester filter if provided
        if (semester) assignmentFilter.semester = semester;

        const assignment = await CourseAssignment.findOne(
          assignmentFilter
        ).populate("lecturer_id", "name email");

        return {
          ...registration.toObject(),
          assignment: assignment
            ? {
                level: assignment.level,
                semester: assignment.semester,
                lecturer: assignment.lecturer_id,
                assignment_id: assignment._id,
              }
            : null,
        };
      })
    );

    // Filter by semester if provided
    const filteredRegistrations = registrationsWithAssignments.filter((reg) => {
      if (semester && (!reg.assignment || reg.assignment.semester !== semester))
        return false;
      return true;
    });

    const total = await CourseRegistration.countDocuments({
      student_id: req.user._id,
    });

    res.json({
      registrations: filteredRegistrations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total: filteredRegistrations.length,
      filters: {
        level: req.user.level,
        semester: semester || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get available courses for registration
export const getAvailableCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, semester } = req.query;

    // Build filter for course assignments in student's department and level
    const assignmentFilter = {
      department_id: req.user.department_id,
      level: req.user.level, // Always use the student's current level
    };

    // Add semester filter if provided
    if (semester) {
      assignmentFilter.semester = semester;
    }

    // Get course assignments that match the criteria
    const courseAssignments = await CourseAssignment.find(assignmentFilter)
      .populate({
        path: "course_id",
        populate: [
          { path: "department_id", select: "name code" },
          { path: "hod_id", select: "name email" },
        ],
      })
      .populate("lecturer_id", "name email")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ "course_id.title": 1 });

    // Extract courses from assignments and add assignment info
    const courses = courseAssignments
      .filter((assignment) => assignment.course_id) // Filter out null course references
      .map((assignment) => ({
        ...assignment.course_id.toObject(),
        assignment: {
          level: assignment.level,
          semester: assignment.semester,
          lecturer: assignment.lecturer_id,
          assignment_id: assignment._id,
        },
      }));

    // Get student's current registrations to mark registered courses
    const registrations = await CourseRegistration.find({
      student_id: req.user._id,
    });
    const registeredCourseIds = registrations.map((reg) =>
      reg.course_id.toString()
    );

    const coursesWithStatus = courses.map((course) => ({
      ...course,
      isRegistered: registeredCourseIds.includes(course._id.toString()),
    }));

    const total = await CourseAssignment.countDocuments(assignmentFilter);

    res.json({
      courses: coursesWithStatus,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      filters: {
        level: req.user.level,
        semester: semester || null,
        department: req.user.department_id,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Unregister from course
export const unregisterFromCourse = async (req, res) => {
  try {
    const { registrationId } = req.params;

    const registration = await CourseRegistration.findOne({
      _id: registrationId,
      student_id: req.user._id,
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    await CourseRegistration.findByIdAndDelete(registrationId);

    res.json({ message: "Successfully unregistered from course" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
