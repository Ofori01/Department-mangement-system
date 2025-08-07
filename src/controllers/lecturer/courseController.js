import { Course, CourseAssignment } from "../../models/index.js";

/**
 * Get all courses assigned to the authenticated lecturer
 * This endpoint provides courses that lecturers can select when creating assignments
 */
export const getAssignedCourses = async (req, res) => {
  try {
    const { page = 1, limit = 50, department_id, level, semester } = req.query;

    // Build base filter for course assignments
    const assignmentFilter = { lecturer_id: req.user._id };

    // Get course assignments for the lecturer
    const courseAssignments = await CourseAssignment.find(assignmentFilter)
      .populate({
        path: "course_id",
        populate: {
          path: "department_id hod_id",
          select: "name code email",
        },
      })
      .populate("lecturer_id", "name email")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Extract courses and apply additional filters if provided
    let courses = courseAssignments
      .map((assignment) => assignment.course_id)
      .filter((course) => course); // Remove null courses

    // Apply additional filters
    if (department_id) {
      courses = courses.filter(
        (course) => course.department_id._id.toString() === department_id
      );
    }

    if (level) {
      courses = courses.filter((course) => course.level === level);
    }

    if (semester) {
      courses = courses.filter((course) => course.semester === semester);
    }

    // Calculate total for pagination
    const totalAssignments = await CourseAssignment.countDocuments(
      assignmentFilter
    );

    // Format response with additional metadata
    const formattedCourses = courses.map((course) => ({
      _id: course._id,
      title: course.title,
      code: course.code,
      level: course.level,
      semester: course.semester,
      department: {
        _id: course.department_id._id,
        name: course.department_id.name,
        code: course.department_id.code,
      },
      hod: {
        _id: course.hod_id._id,
        name: course.hod_id.name,
        email: course.hod_id.email,
      },
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }));

    res.json({
      success: true,
      message: "Assigned courses retrieved successfully",
      data: {
        courses: formattedCourses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalAssignments / limit),
          totalCourses: formattedCourses.length,
          totalAssignments,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get assigned courses error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving assigned courses",
      error: error.message,
    });
  }
};

/**
 * Get detailed information about a specific course assigned to the lecturer
 */
export const getAssignedCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify lecturer is assigned to this course
    const courseAssignment = await CourseAssignment.findOne({
      course_id: courseId,
      lecturer_id: req.user._id,
    })
      .populate({
        path: "course_id",
        populate: {
          path: "department_id hod_id",
          select: "name code email",
        },
      })
      .populate("lecturer_id", "name email");

    if (!courseAssignment) {
      return res.status(404).json({
        success: false,
        message: "Course not found or you are not assigned to this course",
      });
    }

    const course = courseAssignment.course_id;

    // Format detailed course information
    const formattedCourse = {
      _id: course._id,
      title: course.title,
      code: course.code,
      level: course.level,
      semester: course.semester,
      department: {
        _id: course.department_id._id,
        name: course.department_id.name,
        code: course.department_id.code,
      },
      hod: {
        _id: course.hod_id._id,
        name: course.hod_id.name,
        email: course.hod_id.email,
      },
      assignmentInfo: {
        assignedAt: courseAssignment.createdAt,
        lecturer: {
          _id: courseAssignment.lecturer_id._id,
          name: courseAssignment.lecturer_id.name,
          email: courseAssignment.lecturer_id.email,
        },
      },
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };

    res.json({
      success: true,
      message: "Course details retrieved successfully",
      data: {
        course: formattedCourse,
      },
    });
  } catch (error) {
    console.error("Get assigned course error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving course details",
      error: error.message,
    });
  }
};

/**
 * Get courses summary for quick reference
 */
export const getCoursesSummary = async (req, res) => {
  try {
    const courseAssignments = await CourseAssignment.find({
      lecturer_id: req.user._id,
    }).populate("course_id", "title code level semester");

    const summary = {
      totalCourses: courseAssignments.length,
      coursesByLevel: {},
      coursesBySemester: {},
      courses: courseAssignments.map((assignment) => ({
        _id: assignment.course_id._id,
        title: assignment.course_id.title,
        code: assignment.course_id.code,
        level: assignment.course_id.level,
        semester: assignment.course_id.semester,
      })),
    };

    // Group by level
    courseAssignments.forEach((assignment) => {
      const level = assignment.course_id.level;
      if (!summary.coursesByLevel[level]) {
        summary.coursesByLevel[level] = 0;
      }
      summary.coursesByLevel[level]++;
    });

    // Group by semester
    courseAssignments.forEach((assignment) => {
      const semester = assignment.course_id.semester;
      if (!summary.coursesBySemester[semester]) {
        summary.coursesBySemester[semester] = 0;
      }
      summary.coursesBySemester[semester]++;
    });

    res.json({
      success: true,
      message: "Courses summary retrieved successfully",
      data: summary,
    });
  } catch (error) {
    console.error("Get courses summary error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving courses summary",
      error: error.message,
    });
  }
};
