import { CourseRegistration, Course } from "../../models/index.js";

// Register for a course (student self-registration)
export const registerForCourse = async (req, res) => {
  try {
    const { course_id } = req.body;

    // Verify course exists and is in student's department
    const course = await Course.findOne({
      _id: course_id,
      department_id: req.user.department_id,
    });

    if (!course) {
      return res
        .status(404)
        .json({
          message: "Course not found or not available for your department",
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
    await registration.populate("course_id", "title code level semester");

    res.status(201).json({
      message: "Successfully registered for course",
      registration,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get student's registered courses
export const getRegisteredCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, level, semester } = req.query;

    const registrations = await CourseRegistration.find({
      student_id: req.user._id,
    })
      .populate({
        path: "course_id",
        match: {
          ...(level && { level }),
          ...(semester && { semester }),
        },
        populate: { path: "department_id hod_id", select: "name email" },
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Filter out registrations where course is null (due to match filter)
    const validRegistrations = registrations.filter(
      (reg) => reg.course_id !== null
    );

    const total = await CourseRegistration.countDocuments({
      student_id: req.user._id,
    });

    res.json({
      registrations: validRegistrations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get available courses for registration
export const getAvailableCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, level, semester } = req.query;

    // Build filter for courses in student's department and level
    const filter = {
      department_id: req.user.department_id,
      ...(level && { level }),
      ...(semester && { semester }),
    };

    // If no level specified, default to student's level
    if (!level && req.user.level) {
      filter.level = req.user.level;
    }

    const courses = await Course.find(filter)
      .populate("department_id hod_id", "name email")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ title: 1 });

    // Get student's current registrations to mark registered courses
    const registrations = await CourseRegistration.find({
      student_id: req.user._id,
    });
    const registeredCourseIds = registrations.map((reg) =>
      reg.course_id.toString()
    );

    const coursesWithStatus = courses.map((course) => ({
      ...course.toObject(),
      isRegistered: registeredCourseIds.includes(course._id.toString()),
    }));

    const total = await Course.countDocuments(filter);

    res.json({
      courses: coursesWithStatus,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
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
