import { Assignment, Course, CourseAssignment } from "../../models/index.js";

// Create assignment
export const createAssignment = async (req, res) => {
  try {
    const { course_id, title, description, due_date, file_url } = req.body;

    // Verify lecturer is assigned to the course
    const courseAssignment = await CourseAssignment.findOne({
      course_id,
      lecturer_id: req.user._id,
    }).populate("course_id");

    if (!courseAssignment) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this course" });
    }

    const assignment = new Assignment({
      course_id,
      title,
      description,
      due_date,
      file_url,
      created_by: req.user._id,
    });

    await assignment.save();
    await assignment.populate("course_id created_by", "title code name email");

    res.status(201).json({
      message: "Assignment created successfully",
      assignment,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get assignments for lecturer's courses
export const getAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 10, course_id } = req.query;

    // Get courses assigned to lecturer
    const courseAssignments = await CourseAssignment.find({
      lecturer_id: req.user._id,
    });
    const courseIds = courseAssignments.map(
      (assignment) => assignment.course_id
    );

    const filter = {
      course_id: { $in: courseIds },
      created_by: req.user._id,
    };

    if (course_id) filter.course_id = course_id;

    const assignments = await Assignment.find(filter)
      .populate("course_id", "title code level semester")
      .populate("created_by", "name email")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Assignment.countDocuments(filter);

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

// Get single assignment
export const getAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      created_by: req.user._id,
    })
      .populate("course_id", "title code level semester")
      .populate("created_by", "name email");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.json({ assignment });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update assignment
export const updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const updates = req.body;

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      created_by: req.user._id,
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // If updating course, verify lecturer is assigned to new course
    if (
      updates.course_id &&
      updates.course_id !== assignment.course_id.toString()
    ) {
      const courseAssignment = await CourseAssignment.findOne({
        course_id: updates.course_id,
        lecturer_id: req.user._id,
      });

      if (!courseAssignment) {
        return res
          .status(403)
          .json({ message: "You are not assigned to the new course" });
      }
    }

    Object.assign(assignment, updates);
    await assignment.save();
    await assignment.populate("course_id created_by", "title code name email");

    res.json({
      message: "Assignment updated successfully",
      assignment,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete assignment
export const deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      created_by: req.user._id,
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    await Assignment.findByIdAndDelete(assignmentId);

    res.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get lecturer's assigned courses
export const getAssignedCourses = async (req, res) => {
  try {
    const courseAssignments = await CourseAssignment.find({
      lecturer_id: req.user._id,
    }).populate({
      path: "course_id",
      populate: { path: "department_id hod_id", select: "name email" },
    });

    const courses = courseAssignments.map((assignment) => assignment.course_id);

    res.json({ courses });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
