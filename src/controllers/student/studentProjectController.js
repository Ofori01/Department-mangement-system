import ProjectYear from "../../models/academic/projectYear.js";
import ProjectGroup from "../../models/academic/projectGroup.js";
import ProjectGrade from "../../models/academic/projectGrade.js";

// Get student's project group
export const getMyProjectGroup = async (req, res) => {
  try {
    const studentId = req.user.userId;

    // Find project group where student is a member
    const projectGroup = await ProjectGroup.findOne({
      "members.student_id": studentId,
    })
      .populate("project_year_id", "academic_year department_id")
      .populate("project_year_id.department_id", "name")
      .populate("supervisor_id", "name email phone")
      .populate("members.student_id", "name index_number level");

    if (!projectGroup) {
      return res.status(404).json({
        error: "You are not assigned to any project group",
        message: "Contact your department to be assigned to a project group",
      });
    }

    res.json({
      message: "Project group retrieved successfully",
      data: projectGroup,
    });
  } catch (error) {
    console.error("Error fetching student project group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get student's project grades
export const getMyProjectGrades = async (req, res) => {
  try {
    const studentId = req.user.userId;

    // Find project group where student is a member
    const projectGroup = await ProjectGroup.findOne({
      "members.student_id": studentId,
    });

    if (!projectGroup) {
      return res.status(404).json({
        error: "You are not assigned to any project group",
      });
    }

    // Get all grades for this project group
    const grades = await ProjectGrade.find({
      project_group_id: projectGroup._id,
    })
      .populate("grader_id", "name email")
      .sort({ grading_date: -1 });

    // Calculate final grade
    const finalGrade = await ProjectGrade.calculateFinalProjectGrade(
      projectGroup._id
    );

    res.json({
      message: "Project grades retrieved successfully",
      data: {
        project_group: {
          _id: projectGroup._id,
          topic: projectGroup.topic,
          current_stage: projectGroup.current_stage,
          status: projectGroup.status,
        },
        grades,
        final_grade: parseFloat(finalGrade.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Error fetching student project grades:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all project groups in student's department (for reference)
export const getDepartmentProjects = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const studentDepartmentId = req.user.department_id;

    let query = {};

    // Find project year for the student's department
    const projectYearQuery = { department_id: studentDepartmentId };
    if (academic_year) {
      projectYearQuery.academic_year = academic_year;
    }

    const projectYears = await ProjectYear.find(projectYearQuery);

    if (projectYears.length === 0) {
      return res.json({
        message: "No projects found for your department",
        data: [],
      });
    }

    const projectYearIds = projectYears.map((py) => py._id);
    query.project_year_id = { $in: projectYearIds };

    const projectGroups = await ProjectGroup.find(query)
      .populate("project_year_id", "academic_year")
      .populate("supervisor_id", "name")
      .select(
        "group_number topic current_stage status supervisor_id project_year_id"
      )
      .sort({ group_number: 1 });

    res.json({
      message: "Department projects retrieved successfully",
      data: projectGroups,
    });
  } catch (error) {
    console.error("Error fetching department projects:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
