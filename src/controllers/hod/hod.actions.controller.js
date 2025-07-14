import LecturerModel from "../../models/lecturer.js";
import courseModel from "../../models/courses.js";

export async function assignLecturerToCourse(req, res) {
  const { lecturer_id, course_id } = req.body;
  console.log(lecturer_id, course_id);

  if (!lecturer_id || !course_id) {
    return res.status(400).send({ message: "Please fill all fields" });
  }

  try {
    const lecturer = await LecturerModel.findByIdAndUpdate(
      lecturer_id,
      { $push: { courses: course_id } },
      { new: true }
    );
    if (!lecturer) {
      return res.status(404).send({ message: "Lecturer not found" });
    }

    res
      .status(200)
      .send({ message: "Lecturer assigned to course successfully", lecturer });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({
        message:
          "An error occurred while assigning lecturer to course. Please try again later",
      });
  }
}

export async function createCourse(req, res) {
  const { course_name, course_id, semester, level, departments } = req.body;
  try {
    if (!course_id || !course_name || !semester || !level || !departments) {
      return res.status(400).send({ message: "Please fill all fields" });
    }

    const newCourse = await courseModel.create({
      course_id,
      course_name,
      semester,
      level,
      departments,
    });

    res.status(201).send({ message: "course created successfully", newCourse });
  } catch (error) {
    console.log(error);

    res
      .status(500)
      .send({
        message:
          "An error occurred while creating course. Please try again later",
      });
  }
}
