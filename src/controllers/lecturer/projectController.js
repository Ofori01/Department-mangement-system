import ProjectYear from "../../models/academic/projectYear.js";
import ProjectGroup from "../../models/academic/projectGroup.js";
import ProjectGrade from "../../models/academic/projectGrade.js";
import User from "../../models/core/user.js";
import { roles } from "../../utils/enums.js";

// Project Year Management
export const createProjectYear = async (req, res) => {
  try {
    const { academic_year, department_id } = req.body;
    const lecturer_id = req.user.userId;

    // Check if user is lecturer or HoD
    if (!["Lecturer", "HoD"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Only lecturers and HoDs can create project years" });
    }

    // Check if project year already exists for this department
    const existingProjectYear = await ProjectYear.findOne({
      academic_year,
      department_id,
    });

    if (existingProjectYear) {
      return res
        .status(400)
        .json({ error: "Project year already exists for this department" });
    }

    const projectYear = new ProjectYear({
      academic_year,
      department_id,
      created_by: lecturer_id,
    });

    await projectYear.save();
    await projectYear.populate("department_id", "name");
    await projectYear.populate("created_by", "name email");

    res.status(201).json({
      message: "Project year created successfully",
      data: projectYear,
    });
  } catch (error) {
    console.error("Error creating project year:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getProjectYears = async (req, res) => {
  try {
    const { department_id } = req.query;
    let query = {};

    // If user is lecturer, they can only see their department's project years
    if (req.user.role === "Lecturer") {
      query.department_id = req.user.department_id;
    } else if (department_id && req.user.role === "HoD") {
      query.department_id = department_id;
    }

    const projectYears = await ProjectYear.find(query)
      .populate("department_id", "name")
      .populate("created_by", "name email")
      .sort({ academic_year: -1 });

    res.json({
      message: "Project years retrieved successfully",
      data: projectYears,
    });
  } catch (error) {
    console.error("Error fetching project years:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Project Group Management
export const createProjectGroup = async (req, res) => {
  try {
    const { project_year_id, topic, members, supervisor_id } = req.body;

    // Validate project year exists
    const projectYear = await ProjectYear.findById(project_year_id);
    if (!projectYear) {
      return res.status(404).json({ error: "Project year not found" });
    }

    // Validate supervisor
    const supervisor = await User.findOne({
      _id: supervisor_id,
      user_type: UserType.LECTURER,
    });
    if (!supervisor) {
      return res
        .status(404)
        .json({ error: "Supervisor not found or not a lecturer" });
    }

    // Validate all members are final year students (400 level)
    const studentIds = members.map((member) => member.student_id);
    const students = await User.find({
      _id: { $in: studentIds },
      user_type: UserType.STUDENT,
      level: "400",
    });

    if (students.length !== members.length) {
      return res
        .status(400)
        .json({ error: "All members must be 400-level students" });
    }

    // Check if students are already in another group for this project year
    const existingGroups = await ProjectGroup.find({
      project_year_id,
      "members.student_id": { $in: studentIds },
    });

    if (existingGroups.length > 0) {
      return res.status(400).json({
        error: "One or more students are already assigned to a project group",
      });
    }

    // Generate group number
    const groupCount = await ProjectGroup.countDocuments({ project_year_id });
    const group_number = groupCount + 1;

    // Enrich member data
    const enrichedMembers = members.map((member) => {
      const student = students.find(
        (s) => s._id.toString() === member.student_id.toString()
      );
      return {
        student_id: member.student_id,
        student_name: student.name,
        student_index: student.index_number,
      };
    });

    const projectGroup = new ProjectGroup({
      project_year_id,
      group_number,
      topic,
      members: enrichedMembers,
      supervisor_id,
    });

    await projectGroup.save();
    await projectGroup.populate("project_year_id", "academic_year");
    await projectGroup.populate("supervisor_id", "name email");
    await projectGroup.populate("members.student_id", "name index_number");

    res.status(201).json({
      message: "Project group created successfully",
      data: projectGroup,
    });
  } catch (error) {
    console.error("Error creating project group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getProjectGroups = async (req, res) => {
  try {
    const { project_year_id, supervisor_id, current_stage, status } = req.query;
    let query = {};

    if (project_year_id) query.project_year_id = project_year_id;
    if (supervisor_id) query.supervisor_id = supervisor_id;
    if (current_stage) query.current_stage = current_stage;
    if (status) query.status = status;

    // If user is lecturer, they can only see groups they supervise
    if (req.user.role === "Lecturer") {
      query.supervisor_id = req.user.userId;
    }

    const projectGroups = await ProjectGroup.find(query)
      .populate("project_year_id", "academic_year")
      .populate("supervisor_id", "name email")
      .populate("members.student_id", "name index_number level")
      .sort({ group_number: 1 });

    res.json({
      message: "Project groups retrieved successfully",
      data: projectGroups,
    });
  } catch (error) {
    console.error("Error fetching project groups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProjectGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const updates = req.body;

    const projectGroup = await ProjectGroup.findById(groupId);
    if (!projectGroup) {
      return res.status(404).json({ error: "Project group not found" });
    }

    // Check if user can update this group
    if (
      req.user.role === "Lecturer" &&
      projectGroup.supervisor_id.toString() !== req.user.userId
    ) {
      return res
        .status(403)
        .json({ error: "You can only update groups you supervise" });
    }

    const updatedGroup = await ProjectGroup.findByIdAndUpdate(
      groupId,
      updates,
      { new: true, runValidators: true }
    )
      .populate("project_year_id", "academic_year")
      .populate("supervisor_id", "name email")
      .populate("members.student_id", "name index_number");

    res.json({
      message: "Project group updated successfully",
      data: updatedGroup,
    });
  } catch (error) {
    console.error("Error updating project group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Project Grading
export const gradeProject = async (req, res) => {
  try {
    const {
      project_group_id,
      stage,
      score,
      comments,
      is_final = true,
    } = req.body;
    const grader_id = req.user.userId;

    // Validate project group exists
    const projectGroup = await ProjectGroup.findById(project_group_id);
    if (!projectGroup) {
      return res.status(404).json({ error: "Project group not found" });
    }

    // Check if user can grade this project
    if (
      req.user.role === "Lecturer" &&
      projectGroup.supervisor_id.toString() !== req.user.userId
    ) {
      return res
        .status(403)
        .json({ error: "You can only grade projects you supervise" });
    }

    // Check if final grade already exists for this stage
    if (is_final) {
      const existingGrade = await ProjectGrade.findOne({
        project_group_id,
        stage,
        is_final: true,
      });

      if (existingGrade) {
        return res
          .status(400)
          .json({ error: `Final grade for ${stage} stage already exists` });
      }
    }

    const projectGrade = new ProjectGrade({
      project_group_id,
      stage,
      grader_id,
      grader_name: req.user.name,
      score,
      comments,
      is_final,
    });

    await projectGrade.save();

    // Update project group's current stage if this is a final grade
    if (is_final) {
      const stageOrder = ["Proposal", "Progress", "Defense"];
      const currentStageIndex = stageOrder.indexOf(stage);

      if (currentStageIndex < stageOrder.length - 1) {
        const nextStage = stageOrder[currentStageIndex + 1];
        await ProjectGroup.findByIdAndUpdate(project_group_id, {
          current_stage: nextStage,
        });
      } else {
        // If defense stage is completed, mark project as completed
        await ProjectGroup.findByIdAndUpdate(project_group_id, {
          status: "Completed",
        });
      }
    }

    await projectGrade.populate("project_group_id", "topic group_number");
    await projectGrade.populate("grader_id", "name email");

    res.status(201).json({
      message: "Project graded successfully",
      data: projectGrade,
    });
  } catch (error) {
    console.error("Error grading project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getProjectGrades = async (req, res) => {
  try {
    const { project_group_id, stage, grader_id, is_final } = req.query;
    let query = {};

    if (project_group_id) query.project_group_id = project_group_id;
    if (stage) query.stage = stage;
    if (grader_id) query.grader_id = grader_id;
    if (is_final !== undefined) query.is_final = is_final === "true";

    const projectGrades = await ProjectGrade.find(query)
      .populate("project_group_id", "topic group_number current_stage")
      .populate("grader_id", "name email")
      .sort({ grading_date: -1 });

    res.json({
      message: "Project grades retrieved successfully",
      data: projectGrades,
    });
  } catch (error) {
    console.error("Error fetching project grades:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getFinalProjectGrade = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Validate project group exists
    const projectGroup = await ProjectGroup.findById(groupId);
    if (!projectGroup) {
      return res.status(404).json({ error: "Project group not found" });
    }

    // Get all final grades for this project
    const grades = await ProjectGrade.find({
      project_group_id: groupId,
      is_final: true,
    }).sort({ stage: 1 });

    // Calculate overall grade
    const finalGrade = await ProjectGrade.calculateFinalProjectGrade(groupId);

    res.json({
      message: "Final project grade calculated successfully",
      data: {
        project_group: projectGroup,
        stage_grades: grades,
        final_grade: parseFloat(finalGrade.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Error calculating final project grade:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
