import HodModel from "../../models/hod.js";

async function createHod(req, res) {
  try {
    const hodData = req.body;
    const newHod = HodModel.create(hodData);
    await newHod.save();
    res.status(201).json(newHod);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getHod(req, res) {
  try {
    const hod = await HodModel.findById(req.params.id);
    if (!hod) {
      return res.status(404).json({ message: "HOD not found" });
    }
    res.status(200).json(hod);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updateHod(req, res) {
  try {
    const updatedHod = await HodModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedHod) {
      return res.status(404).json({ message: "HOD not found" });
    }
    res.status(200).json(updatedHod);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deleteHod(req, res) {
  try {
    const deletedHod = await HodModel.findByIdAndDelete(req.params.id);
    if (!deletedHod) {
      return res.status(404).json({ message: "HOD not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export { createHod, getHod, updateHod, deleteHod };
