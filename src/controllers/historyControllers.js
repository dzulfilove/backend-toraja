const db = require("../config/db");
// const fs = require("fs");
const path = require("path");
const fs = require("fs").promises;

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

// UPDATE history + update/add images
// controllers/historyController.js
exports.updateHistory = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { title, description } = req.body;
    const historyId = req.params.id;

    const [result] = await connection.query(
      "UPDATE history SET title=?, description=? WHERE id=?",
      [title, description, historyId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "History not found" });

    res.json({
      id: historyId,
      title,
      description,
      message: "History updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};


exports.updateSingleImage = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const historyId = req.params.id;
    const imageId = req.params.imageId;
    const filename = "uploads/" + req.file.filename;

    // Cari file lama
    const [rows] = await connection.query(
      "SELECT image FROM image_history WHERE id=? AND id_history=?",
      [imageId, historyId]
    );
    const oldImage = rows[0]?.image;

    // Update DB
    const [result] = await connection.query(
      "UPDATE image_history SET image=? WHERE id=?",
      [filename, imageId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Hapus file lama
    if (oldImage) {
      const oldPath = path.join(__dirname, "..", oldImage);
      try {
        await fs.unlink(oldPath);
      } catch (e) {
        console.warn("Gagal hapus file lama:", e.message);
      }
    }

    res.json({ message: "Image updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};


exports.addImage = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const historyId = req.params.id;
    const filename = "uploads/" + req.file.filename;

    await connection.query(
      "INSERT INTO image_history (id_history, image) VALUES (?, ?)",
      [historyId, filename]
    );

    res.json({ message: "Image added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

