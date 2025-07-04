const db = require("../config/db");

// GET all history + images
exports.getAll = async (req, res) => {
  try {
    const [histories] = await db.query("SELECT * FROM history");
    const [images] = await db.query("SELECT * FROM image_history");

    const data = histories.map((history) => ({
      ...history,
      images: images
        .filter((img) => img.id_history === history.id)
        .map((img) => ({ id: img.id, image: img.image })),
    }));

    res.json(data);
  } catch (err) {
    console.error(err); // debug cepat
    res.status(500).json({ message: err.message });
  }
};

// GET history by id + images
exports.getById = async (req, res) => {
  try {
    const [histories] = await db.query("SELECT * FROM history WHERE id = ?", [
      req.params.id,
    ]);
    if (histories.length === 0)
      return res.status(404).json({ message: "Not found" });

    const history = histories[0];
    const [images] = await db.query(
      "SELECT * FROM image_history WHERE id_history = ?",
      [history.id]
    );

    res.json({
      ...history,
      images: images.map((img) => ({ id: img.id, image: img.image })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// CREATE new history
exports.create = async (req, res) => {
  try {
    const { title, description, image } = req.body;
    const [result] = await db.query(
      "INSERT INTO history (title, description, image) VALUES (?, ?, ?)",
      [title, description, image]
    );
    res.status(201).json({
      id: result.insertId,
      title,
      description,
      image,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

// UPDATE history
exports.update = async (req, res) => {
  try {
    const { title, description } = req.body;
    const [result] = await db.query(
      "UPDATE history SET title=?, description=? WHERE id=?",
      [title, description, req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Not found" });

    res.json({
      id: req.params.id,
      title,
      description,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

// DELETE history
exports.delete = async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM history WHERE id=?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// GET all images of a history (opsional)
exports.getImage = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM image_history WHERE id_history = ?",
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Not found" });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// UPDATE image - upload file baru, simpan path ke db
exports.updateImage = async (req, res) => {
  try {
    // req.file.path berisi path file yang disimpan
    const imagePath = req.file.path; // contoh: uploads/123456789.jpg

    const [result] = await db.query(
      "UPDATE image_history SET image=? WHERE id_history=?",
      [imagePath, req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Not found" });

    res.json({ id: req.params.id, image: imagePath });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};
