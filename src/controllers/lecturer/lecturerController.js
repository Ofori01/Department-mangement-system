import LecturerModel from "../../models/lecturer.js";

// Get all lecturers
export async function getLecturers(req, res) {
  try {
    const lecturers = await LecturerModel.find()
    res.json(lecturers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get single lecturer by ID
export async function getLecturer(req, res) {
  try {
    const {id} = req.params
   if(!id){
    return res.status(401).send({message: "lecturer id not specified"})
   }
    const lecturer = await LecturerModel.findById(req.params.id);
    if (!lecturer) return res.status(404).json({ error: 'Lecturer not found' });
    res.json(lecturer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create a new lecturer
export async function createLecturer(req, res) {
  try {
    //create lec
    const {email, password, department, name} = req.body
    const lecturer = await LecturerModel.create({name,password,department,name, email});
    res.status(201).json({ "message":"Lectuter Created successfully", lecturer});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Update lecturer by ID
export async function updateLecturer(req, res) {
  try {
    const lecturer = await findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!lecturer) return res.status(404).json({ error: 'Lecturer not found' });
    res.json(lecturer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Delete lecturer by ID
export async function deleteLecturer(req, res) {
  try {
    const lecturer = await LecturerModel.findByIdAndDelete(req.params.id);
    if (!lecturer) return res.status(404).json({ error: 'Lecturer not found' });
    res.json({ message: 'Lecturer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}