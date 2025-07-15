const db = require("../config/db");
// const fs = require("fs");
const path = require("path");
const fs = require("fs").promises;

// GET all history + images
exports.getAll = async (req, res) => {
  try {
    console.log("[GET ALL HISTORY] Start fetching histories and images");
    const [histories] = await db.query("SELECT * FROM history");
    const [images] = await db.query("SELECT * FROM image_history");

    console.log("[GET ALL HISTORY] Histories:", histories.length, "Images:", images.length);

    const data = histories.map((history) => ({
      ...history,
      images: images
        .filter((img) => img.id_history === history.id)
        .map((img) => ({ id: img.id, image: img.image })),
    }));

    res.json(data);
  } catch (err) {
    console.error("[GET ALL HISTORY] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET history by id + images
exports.getById = async (req, res) => {
  try {
    console.log("[GET HISTORY BY ID] Params:", req.params);
    const [histories] = await db.query("SELECT * FROM history WHERE id = ?", [
      req.params.id,
    ]);
    if (histories.length === 0) {
      console.warn("[GET HISTORY BY ID] History not found with id:", req.params.id);
      return res.status(404).json({ message: "Not found" });
    }

    const history = histories[0];
    const [images] = await db.query(
      "SELECT * FROM image_history WHERE id_history = ?",
      [history.id]
    );

    console.log("[GET HISTORY BY ID] History:", history, "Images count:", images.length);

    res.json({
      ...history,
      images: images.map((img) => ({ id: img.id, image: img.image })),
    });
  } catch (err) {
    console.error("[GET HISTORY BY ID] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// CREATE new history
exports.create = async (req, res) => {
  try {
    console.log("[CREATE HISTORY] Body:", req.body);
    const { title, description, image } = req.body;

    const [result] = await db.query(
      "INSERT INTO history (title, description, image) VALUES (?, ?, ?)",
      [title, description, image]
    );
    console.log("[CREATE HISTORY] Insert result:", result);

    res.status(201).json({
      id: result.insertId,
      title,
      description,
      image,
    });
  } catch (err) {
    console.error("[CREATE HISTORY] Error:", err);
    res.status(400).json({ message: err.message });
  }
};

// UPDATE history
exports.updateHistory = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("[UPDATE HISTORY] Params:", req.params, "Body:", req.body);
    const { title, description } = req.body;
    const historyId = req.params.id;

    const [result] = await connection.query(
      "UPDATE history SET title=?, description=? WHERE id=?",
      [title, description, historyId]
    );
    console.log("[UPDATE HISTORY] Update result:", result);

    if (result.affectedRows === 0) {
      console.warn("[UPDATE HISTORY] History not found with id:", historyId);
      return res.status(404).json({ message: "History not found" });
    }

    res.json({
      id: historyId,
      title,
      description,
      message: "History updated successfully",
    });
  } catch (err) {
    console.error("[UPDATE HISTORY] Error:", err);
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

    console.log("[UPDATE SINGLE IMAGE] Params:", req.params, "Filename:", filename);

    // Cari file lama
    const [rows] = await connection.query(
      "SELECT image FROM image_history WHERE id=? AND id_history=?",
      [imageId, historyId]
    );
    const oldImage = rows[0]?.image;
    console.log("[UPDATE SINGLE IMAGE] Old image:", oldImage);

    // Update DB
    const [result] = await connection.query(
      "UPDATE image_history SET image=? WHERE id=?",
      [filename, imageId]
    );
    console.log("[UPDATE SINGLE IMAGE] Update result:", result);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Hapus file lama
    if (oldImage) {
      const oldPath = path.join(__dirname, "..", oldImage);
      try {
        await fs.unlink(oldPath);
        console.log("[UPDATE SINGLE IMAGE] Old file deleted:", oldPath);
      } catch (e) {
        console.warn("[UPDATE SINGLE IMAGE] Failed to delete old file:", e.message);
      }
    }

    res.json({ message: "Image updated successfully" });
  } catch (err) {
    console.error("[UPDATE SINGLE IMAGE] Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.deleteSingleImage = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const historyId = req.params.id;
    const imageId = req.params.imageId;
    console.log("[DELETE SINGLE IMAGE] Params:", req.params);

    // Cari file lama
    const [rows] = await connection.query(
      "SELECT image FROM image_history WHERE id=? AND id_history=?",
      [imageId, historyId]
    );
    const oldImage = rows[0]?.image;
    console.log("[DELETE SINGLE IMAGE] Old image:", oldImage);

    // Hapus file lama
    if (oldImage) {
      const oldPath = path.join(__dirname, "..", oldImage);
      try {
        await fs.unlink(oldPath);
        console.log("[DELETE SINGLE IMAGE] File deleted:", oldPath);
      } catch (e) {
        console.log("[DELETE SINGLE IMAGE] Failed to delete file:", e.message);
      }
    }

    // Hapus dari DB
    const [result] = await connection.query(
      "DELETE FROM image_history WHERE id=?",
      [imageId]
    );
    console.log("[DELETE SINGLE IMAGE] Delete result:", result);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    console.error("[DELETE SINGLE IMAGE] Error:", err);
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

    console.log("[ADD IMAGE] Params:", req.params, "Filename:", filename);

    await connection.query(
      "INSERT INTO image_history (id_history, image) VALUES (?, ?)",
      [historyId, filename]
    );

    res.json({ message: "Image added successfully" });
  } catch (err) {
    console.error("[ADD IMAGE] Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};
