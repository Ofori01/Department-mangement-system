import {
  Submission,
  Assignment,
  CourseAssignment,
  Document,
} from "../../models/index.js";
import { getFileInfo } from "../../middleware/fileUpload.js";

// Get submissions for lecturer's assignments
export const getSubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, assignment_id, graded } = req.query;

    // Get lecturer's assignments
    const courseAssignments = await CourseAssignment.find({
      lecturer_id: req.user._id,
    });
    const courseIds = courseAssignments.map(
      (assignment) => assignment.course_id
    );

    const assignmentFilter = {
      course_id: { $in: courseIds },
      created_by: req.user._id,
    };
    if (assignment_id) assignmentFilter._id = assignment_id;

    const assignments = await Assignment.find(assignmentFilter).select("_id");
    const assignmentIds = assignments.map((assignment) => assignment._id);

    const filter = { assignment_id: { $in: assignmentIds } };

    // Filter by graded status
    if (graded === "true") {
      filter.grade = { $exists: true, $ne: null };
    } else if (graded === "false") {
      filter.$or = [{ grade: { $exists: false } }, { grade: null }];
    }

    const submissions = await Submission.find(filter)
      .populate({
        path: "assignment_id",
        select: "title due_date course_id",
        populate: { path: "course_id", select: "title code" },
      })
      .populate("student_id", "name email studentId")
      .populate("document_id")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ submitted_at: -1 });

    // Add file info for submissions
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

// Grade submission
export const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;

    // Validate grade
    if (grade < 0 || grade > 100) {
      return res
        .status(400)
        .json({ message: "Grade must be between 0 and 100" });
    }

    const submission = await Submission.findById(submissionId).populate({
      path: "assignment_id",
      populate: { path: "course_id" },
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Verify lecturer created the assignment
    if (
      submission.assignment_id.created_by.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "You can only grade submissions for your assignments",
      });
    }

    submission.grade = grade;
    if (feedback) submission.feedback = feedback;

    await submission.save();
    await submission.populate("student_id", "name email studentId");

    res.json({
      message: "Submission graded successfully",
      submission,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get submission details
export const getSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId)
      .populate({
        path: "assignment_id",
        select: "title description due_date course_id created_by",
        populate: { path: "course_id", select: "title code" },
      })
      .populate("student_id", "name email studentId")
      .populate("document_id");

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Verify lecturer created the assignment
    if (
      submission.assignment_id.created_by.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "You can only view submissions for your assignments",
      });
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

// Get submission statistics for an assignment
export const getSubmissionStats = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Verify assignment belongs to lecturer
    const assignment = await Assignment.findOne({
      _id: assignmentId,
      created_by: req.user._id,
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const [totalSubmissions, gradedSubmissions, pendingSubmissions] =
      await Promise.all([
        Submission.countDocuments({ assignment_id: assignmentId }),
        Submission.countDocuments({
          assignment_id: assignmentId,
          grade: { $exists: true, $ne: null },
        }),
        Submission.countDocuments({
          assignment_id: assignmentId,
          $or: [{ grade: { $exists: false } }, { grade: null }],
        }),
      ]);

    // Calculate grade distribution
    const gradeDistribution = await Submission.aggregate([
      {
        $match: {
          assignment_id: assignmentId,
          grade: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $gte: ["$grade", 90] }, then: "A" },
                { case: { $gte: ["$grade", 80] }, then: "B" },
                { case: { $gte: ["$grade", 70] }, then: "C" },
                { case: { $gte: ["$grade", 60] }, then: "D" },
                { case: { $lt: ["$grade", 60] }, then: "F" },
              ],
              default: "Unknown",
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const averageGrade = await Submission.aggregate([
      {
        $match: {
          assignment_id: assignmentId,
          grade: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: null, average: { $avg: "$grade" } } },
    ]);

    res.json({
      statistics: {
        totalSubmissions,
        gradedSubmissions,
        pendingSubmissions,
        gradeDistribution,
        averageGrade:
          averageGrade.length > 0
            ? Math.round(averageGrade[0].average * 100) / 100
            : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
