import User from "../../models/core/user.js";
import Department from "../../models/core/department.js";

// Promote all students to next level
export const promoteStudents = async (req, res) => {
  try {
    const { academic_year } = req.body;

    if (!academic_year) {
      return res
        .status(400)
        .json({ error: "Academic year is required (e.g., '2024')" });
    }

    // Get all active students
    const activeStudents = await User.find({
      role: "Student",
      status: "Active",
    }).populate("department_id", "name");

    if (activeStudents.length === 0) {
      return res
        .status(404)
        .json({ error: "No active students found to promote" });
    }

    const promotionResults = {
      promoted: [],
      graduated: [],
      errors: [],
    };

    // Process each student
    for (const student of activeStudents) {
      try {
        const currentLevel = parseInt(student.level);

        if (currentLevel === 400) {
          // Graduate 400-level students
          await User.findByIdAndUpdate(student._id, {
            status: "Graduated",
            graduationYear: academic_year,
            graduationDate: new Date(),
          });

          promotionResults.graduated.push({
            _id: student._id,
            name: student.name,
            studentId: student.studentId,
            department: student.department_id?.name,
            previousLevel: "400",
            newStatus: "Graduated",
          });
        } else {
          // Promote to next level
          const nextLevel = (currentLevel + 100).toString();

          await User.findByIdAndUpdate(student._id, {
            level: nextLevel,
          });

          promotionResults.promoted.push({
            _id: student._id,
            name: student.name,
            studentId: student.studentId,
            department: student.department_id?.name,
            previousLevel: student.level,
            newLevel: nextLevel,
          });
        }
      } catch (error) {
        promotionResults.errors.push({
          studentId: student.studentId,
          name: student.name,
          error: error.message,
        });
      }
    }

    // Get summary statistics
    const summary = {
      totalProcessed: activeStudents.length,
      totalPromoted: promotionResults.promoted.length,
      totalGraduated: promotionResults.graduated.length,
      totalErrors: promotionResults.errors.length,
      academicYear: academic_year,
    };

    res.json({
      message: "Student promotion completed",
      summary,
      results: promotionResults,
    });
  } catch (error) {
    console.error("Error promoting students:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get promotion statistics and preview
export const getPromotionPreview = async (req, res) => {
  try {
    // Get counts by level for active students
    const levelCounts = await User.aggregate([
      {
        $match: {
          role: "Student",
          status: "Active",
        },
      },
      {
        $group: {
          _id: "$level",
          count: { $sum: 1 },
          students: {
            $push: {
              _id: "$_id",
              name: "$name",
              studentId: "$studentId",
              department_id: "$department_id",
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Populate department names
    const populatedLevelCounts = await Promise.all(
      levelCounts.map(async (level) => {
        const studentsWithDept = await User.populate(level.students, {
          path: "department_id",
          select: "name",
        });

        return {
          ...level,
          students: studentsWithDept,
        };
      })
    );

    // Calculate promotion impact
    const promotionImpact = populatedLevelCounts.map((level) => {
      const currentLevel = parseInt(level._id);
      const nextLevel =
        currentLevel === 400 ? "Graduated" : (currentLevel + 100).toString();

      return {
        currentLevel: level._id,
        currentCount: level.count,
        nextLevel,
        action: currentLevel === 400 ? "Graduate" : "Promote",
        students: level.students.map((student) => ({
          _id: student._id,
          name: student.name,
          studentId: student.studentId,
          department: student.department_id?.name,
        })),
      };
    });

    const totalStudents = populatedLevelCounts.reduce(
      (sum, level) => sum + level.count,
      0
    );
    const studentsToGraduate =
      populatedLevelCounts.find((level) => level._id === "400")?.count || 0;
    const studentsToPromote = totalStudents - studentsToGraduate;

    res.json({
      message: "Promotion preview retrieved successfully",
      summary: {
        totalActiveStudents: totalStudents,
        studentsToPromote,
        studentsToGraduate,
        levelBreakdown: promotionImpact.map((impact) => ({
          level: impact.currentLevel,
          count: impact.currentCount,
          action: impact.action,
        })),
      },
      detailedPreview: promotionImpact,
    });
  } catch (error) {
    console.error("Error getting promotion preview:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get graduated students
export const getGraduatedStudents = async (req, res) => {
  try {
    const { graduation_year, department_id, page = 1, limit = 20 } = req.query;

    const filter = {
      role: "Student",
      status: "Graduated",
    };

    if (graduation_year) {
      filter.graduationYear = graduation_year;
    }

    if (department_id) {
      filter.department_id = department_id;
    }

    const graduatedStudents = await User.find(filter)
      .populate("department_id", "name")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ graduationDate: -1 });

    const total = await User.countDocuments(filter);

    // Get graduation statistics
    const graduationStats = await User.aggregate([
      {
        $match: {
          role: "Student",
          status: "Graduated",
        },
      },
      {
        $group: {
          _id: {
            year: "$graduationYear",
            department: "$department_id",
          },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id.department",
          foreignField: "_id",
          as: "departmentInfo",
        },
      },
      {
        $unwind: "$departmentInfo",
      },
      {
        $group: {
          _id: "$_id.year",
          totalGraduates: { $sum: "$count" },
          departmentBreakdown: {
            $push: {
              department: "$departmentInfo.name",
              count: "$count",
            },
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    res.json({
      message: "Graduated students retrieved successfully",
      data: {
        graduates: graduatedStudents,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit: parseInt(limit),
        },
        statistics: graduationStats,
      },
    });
  } catch (error) {
    console.error("Error getting graduated students:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Rollback promotion (emergency function)
export const rollbackPromotion = async (req, res) => {
  try {
    const { academic_year, confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        error: "Confirmation required",
        message:
          "This is a destructive operation. Set 'confirm: true' to proceed.",
      });
    }

    if (!academic_year) {
      return res.status(400).json({ error: "Academic year is required" });
    }

    // Find students graduated in the specified academic year
    const recentGraduates = await User.find({
      role: "Student",
      status: "Graduated",
      graduationYear: academic_year,
    });

    // Find students who were promoted (this is trickier, we'll need to track this better in future)
    // For now, we'll provide a manual rollback approach

    const rollbackResults = {
      graduatesReactivated: [],
      errors: [],
    };

    // Reactivate recent graduates back to level 400
    for (const graduate of recentGraduates) {
      try {
        await User.findByIdAndUpdate(graduate._id, {
          status: "Active",
          level: "400",
          $unset: {
            graduationYear: "",
            graduationDate: "",
          },
        });

        rollbackResults.graduatesReactivated.push({
          _id: graduate._id,
          name: graduate.name,
          studentId: graduate.studentId,
        });
      } catch (error) {
        rollbackResults.errors.push({
          studentId: graduate.studentId,
          name: graduate.name,
          error: error.message,
        });
      }
    }

    res.json({
      message: "Rollback completed for graduates",
      warning:
        "Level promotions cannot be automatically rolled back. Please manually adjust student levels if needed.",
      results: rollbackResults,
      note: "Only graduated students have been reactivated to level 400. For complete rollback, manually adjust other student levels.",
    });
  } catch (error) {
    console.error("Error rolling back promotion:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
