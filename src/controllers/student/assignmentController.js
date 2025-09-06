import {
  Assignment,
  Submission,
  CourseRegistration,
  CourseAssignment,
  Document,
} from "../../models/index.js";
import {
  uploadToGridFS,
  deleteFromGridFS,
  getFileInfo,
  downloadFromGridFS,
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

        // Add file info if assignment has a file
        let fileInfo = null;
        if (assignment.file_url) {
          try {
            const assignmentFileInfo = await getFileInfo(assignment.file_url);
            fileInfo = assignmentFileInfo
              ? {
                  originalName:
                    assignmentFileInfo.metadata?.originalName ||
                    assignmentFileInfo.filename,
                  size: assignmentFileInfo.length,
                  uploadDate: assignmentFileInfo.uploadDate,
                  fileId: assignment.file_url,
                  downloadUrl: `/api/student/assignments/${assignment._id}/download`,
                }
              : {
                  fileId: assignment.file_url,
                  downloadUrl: `/api/student/assignments/${assignment._id}/download`,
                };
          } catch (error) {
            // If file info can't be retrieved, still include the download URL
            fileInfo = {
              fileId: assignment.file_url,
              downloadUrl: `/api/student/assignments/${assignment._id}/download`,
            };
          }
        }

        return {
          ...assignment.toObject(),
          submissionStatus,
          fileInfo,
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

    // Create document record for the submission file
    const document = new Document({
      owner_id: req.user._id,
      title: `${assignment.title} - Submission by ${
        req.user.name || req.user.studentId
      }`,
      file_url: fileResult.fileId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      visibility: "private",
    });

    await document.save();

    // Create submission record
    const submission = new Submission({
      assignment_id: assignmentId,
      student_id: req.user._id,
      document_id: document._id, // Link to the document record
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
      .populate("document_id")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ submitted_at: -1 });

    // Add file info for each submission
    const submissionsWithFileInfo = await Promise.all(
      submissions.map(async (submission) => {
        try {
          const document = submission.document_id;
          return {
            ...submission.toObject(),
            fileInfo: document
              ? {
                  originalName: document.originalName,
                  size: document.size,
                  uploadDate: document.createdAt,
                  documentId: document._id,
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
    })
      .populate("assignment_id")
      .populate("document_id");

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

    // Delete old file from GridFS and document record
    try {
      if (submission.document_id) {
        await deleteFromGridFS(submission.document_id.file_url);
        await Document.findByIdAndDelete(submission.document_id._id);
      }
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

    // Create new document record
    const document = new Document({
      owner_id: req.user._id,
      title: `${submission.assignment_id.title} - Resubmission by ${
        req.user.name || req.user.studentId
      }`,
      file_url: fileResult.fileId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      visibility: "private",
    });

    await document.save();

    // Update submission
    submission.document_id = document._id;
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
    })
      .populate({
        path: "assignment_id",
        select: "title description due_date course_id",
        populate: { path: "course_id", select: "title code" },
      })
      .populate("document_id");

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Add file info
    const document = submission.document_id;
    submission.fileInfo = document
      ? {
          originalName: document.originalName,
          size: document.size,
          uploadDate: document.createdAt,
          documentId: document._id,
        }
      : null;

    res.json({ submission });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Download assignment file
export const downloadAssignmentFile = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Verify assignment exists and student is registered for the course
    const assignment = await Assignment.findById(assignmentId).populate(
      "course_id"
    );
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (!assignment.file_url) {
      return res
        .status(404)
        .json({ message: "No file attached to this assignment" });
    }

    // Check if student is registered for the course
    const registration = await CourseRegistration.findOne({
      course_id: assignment.course_id._id,
      student_id: req.user._id,
    });

    if (!registration) {
      return res
        .status(403)
        .json({ message: "You are not registered for this course" });
    }

    // Get file info from GridFS
    const fileInfo = await getFileInfo(assignment.file_url);
    if (!fileInfo) {
      return res.status(404).json({ message: "File not found" });
    }

    // Set appropriate headers
    res.set({
      "Content-Type": fileInfo.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${
        fileInfo.metadata?.originalName || fileInfo.filename || assignment.title
      }"`,
      "Content-Length": fileInfo.length,
    });

    // Get download stream from GridFS
    const downloadStream = await downloadFromGridFS(assignment.file_url);

    downloadStream.on("error", (error) => {
      console.error("Download stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error streaming file" });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
};
