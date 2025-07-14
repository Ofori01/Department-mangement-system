import {
  Assignment,
  Submission,
  CourseRegistration,
} from "../../models/index.js";
import {
  uploadToGridFS,
  deleteFromGridFS,
  getFileInfo,
} from "../../middleware/fileUpload.js";

// Get assignments for student's registered courses
export const getAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 10, course_id, status } = req.query;

    // Get student's registered courses
    const registrations = await CourseRegistration.find({
      student_id: req.user._id,
    });
    const courseIds = registrations.map((reg) => reg.course_id);

    const filter = { course_id: { $in: courseIds } };
    if (course_id) filter.course_id = course_id;

    const assignments = await Assignment.find(filter)
      .populate("course_id", "title code level semester")
      .populate("created_by", "name email")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ due_date: 1 });

    // Add submission status for each assignment
    const assignmentsWithStatus = await Promise.all(
      assignments.map(async (assignment) => {
        const submission = await Submission.findOne({
          assignment_id: assignment._id,
          student_id: req.user._id,
        });

        let submissionStatus = "not_submitted";
        if (submission) {
          if (submission.grade !== null && submission.grade !== undefined) {
            submissionStatus = "graded";
          } else {
            submissionStatus = "submitted";
          }
        } else if (new Date() > assignment.due_date) {
          submissionStatus = "overdue";
        }

        // Filter by status if specified
        if (status && submissionStatus !== status) {
          return null;
        }

        return {
          ...assignment.toObject(),
          submissionStatus,
          submission: submission
            ? {
                _id: submission._id,
                submitted_at: submission.submitted_at,
                grade: submission.grade,
                feedback: submission.feedback,
              }
            : null,
        };
      })
    );

    // Remove null entries (filtered out assignments)
    const filteredAssignments = assignmentsWithStatus.filter(
      (assignment) => assignment !== null
    );

    const total = await Assignment.countDocuments(filter);

    res.json({
      assignments: filteredAssignments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Submit assignment
export const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Verify assignment exists and student is registered for the course
    const assignment = await Assignment.findById(assignmentId).populate(
      "course_id"
    );
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const registration = await CourseRegistration.findOne({
      course_id: assignment.course_id._id,
      student_id: req.user._id,
    });

    if (!registration) {
      return res
        .status(403)
        .json({ message: "You are not registered for this course" });
    }

    // Check if already submitted
    const existingSubmission = await Submission.findOne({
      assignment_id: assignmentId,
      student_id: req.user._id,
    });

    if (existingSubmission) {
      return res.status(400).json({ message: "Assignment already submitted" });
    }

    // Check if past due date
    if (new Date() > assignment.due_date) {
      return res
        .status(400)
        .json({ message: "Assignment submission deadline has passed" });
    }

    // Upload file to GridFS
    const fileResult = await uploadToGridFS(req.file, {
      uploadedBy: req.user._id,
      userRole: req.user.role,
      assignmentId: assignmentId,
      studentId: req.user.studentId,
    });

    // Create submission record
    const submission = new Submission({
      assignment_id: assignmentId,
      student_id: req.user._id,
      file_url: fileResult.fileId,
    });

    await submission.save();
    await submission.populate(
      "assignment_id student_id",
      "title name email studentId"
    );

    res.status(201).json({
      message: "Assignment submitted successfully",
      submission: {
        ...submission.toObject(),
        fileInfo: {
          originalName: fileResult.originalName,
          size: fileResult.size,
          uploadDate: fileResult.uploadDate,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get student's submissions
export const getSubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, assignment_id, graded } = req.query;

    const filter = { student_id: req.user._id };
    if (assignment_id) filter.assignment_id = assignment_id;

    // Filter by graded status
    if (graded === "true") {
      filter.grade = { $exists: true, $ne: null };
    } else if (graded === "false") {
      filter.$or = [{ grade: { $exists: false } }, { grade: null }];
    }

    const submissions = await Submission.find(filter)
      .populate({
        path: "assignment_id",
        select: "title description due_date course_id",
        populate: { path: "course_id", select: "title code" },
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ submitted_at: -1 });

    // Add file info for each submission
    const submissionsWithFileInfo = await Promise.all(
      submissions.map(async (submission) => {
        try {
          const fileInfo = await getFileInfo(submission.file_url);
          return {
            ...submission.toObject(),
            fileInfo: fileInfo
              ? {
                  originalName:
                    fileInfo.metadata?.originalName || fileInfo.filename,
                  size: fileInfo.length,
                  uploadDate: fileInfo.uploadDate,
                }
              : null,
          };
        } catch (error) {
          return {
            ...submission.toObject(),
            fileInfo: null,
          };
        }
      })
    );

    const total = await Submission.countDocuments(filter);

    res.json({
      submissions: submissionsWithFileInfo,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update submission (resubmit before deadline)
export const updateSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const submission = await Submission.findOne({
      _id: submissionId,
      student_id: req.user._id,
    }).populate("assignment_id");

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Check if past due date
    if (new Date() > submission.assignment_id.due_date) {
      return res
        .status(400)
        .json({ message: "Cannot resubmit after deadline" });
    }

    // Check if already graded
    if (submission.grade !== null && submission.grade !== undefined) {
      return res
        .status(400)
        .json({ message: "Cannot resubmit graded assignment" });
    }

    // Delete old file from GridFS
    try {
      await deleteFromGridFS(submission.file_url);
    } catch (error) {
      console.warn("Failed to delete old file from GridFS:", error.message);
    }

    // Upload new file to GridFS
    const fileResult = await uploadToGridFS(req.file, {
      uploadedBy: req.user._id,
      userRole: req.user.role,
      assignmentId: submission.assignment_id._id,
      studentId: req.user.studentId,
      resubmission: true,
    });

    // Update submission
    submission.file_url = fileResult.fileId;
    submission.submitted_at = new Date();

    await submission.save();

    res.json({
      message: "Assignment resubmitted successfully",
      submission: {
        ...submission.toObject(),
        fileInfo: {
          originalName: fileResult.originalName,
          size: fileResult.size,
          uploadDate: fileResult.uploadDate,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get single submission
export const getSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findOne({
      _id: submissionId,
      student_id: req.user._id,
    }).populate({
      path: "assignment_id",
      select: "title description due_date course_id",
      populate: { path: "course_id", select: "title code" },
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Add file info
    try {
      const fileInfo = await getFileInfo(submission.file_url);
      submission.fileInfo = fileInfo
        ? {
            originalName: fileInfo.metadata?.originalName || fileInfo.filename,
            size: fileInfo.length,
            uploadDate: fileInfo.uploadDate,
          }
        : null;
    } catch (error) {
      submission.fileInfo = null;
    }

    res.json({ submission });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
