const db = require("../config/db");
// const fs = require("fs");
const path = require("path");
const fs = require("fs").promises;

// GET all history + images
exports.getAll = async (req, res) => {
  try {
    console.log("[GET ALL] Fetching dance list...");
    const [dance] = await db.query(
      "SELECT dance.*, dance_category.name_category FROM dance INNER JOIN dance_category ON dance.category = dance_category.id"
    );
    console.log("[GET ALL] Dance rows:", dance);

    const [images] = await db.query("SELECT * FROM image_dance");
    console.log("[GET ALL] Image rows:", images);

    const data = dance.map((dance) => ({
      ...dance,
      images: images
        .filter((img) => img.id_dance === dance.id)
        .map((img) => ({ id: img.id, image: img.image })),
    }));

    console.log("[GET ALL] Final combined data:", data);
    res.json(data);
  } catch (err) {
    console.error("[GET ALL] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getAllPart = async (req, res) => {
  try {
    console.log("[GET ALL PART] Fetching first 4 dances...");
    const [dance] = await db.query(
      "SELECT dance.*, dance_category.name_category FROM dance INNER JOIN dance_category ON dance.category = dance_category.id LIMIT 4"
    );
    console.log("[GET ALL PART] Dance rows:", dance);

    const [images] = await db.query("SELECT * FROM image_dance");
    console.log("[GET ALL PART] Image rows:", images);

    const data = dance.map((dance) => ({
      ...dance,
      images: images
        .filter((img) => img.id_dance === dance.id)
        .map((img) => ({ id: img.id, image: img.image })),
    }));

    console.log("[GET ALL PART] Final combined data:", data);
    res.json(data);
  } catch (err) {
    console.error("[GET ALL PART] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    console.log("[GET BY ID] Params:", req.params);
    const [dances] = await db.query("SELECT * FROM dance WHERE id = ?", [
      req.params.id,
    ]);
    console.log("[GET BY ID] Dance rows:", dances);

    if (dances.length === 0) {
      console.warn("[GET BY ID] Dance not found for id:", req.params.id);
      return res.status(404).json({ message: "Not found" });
    }

    const dance = dances[0];
    const [images] = await db.query(
      "SELECT * FROM image_dance WHERE id_dance = ?",
      [dance.id]
    );
    console.log("[GET BY ID] Image rows:", images);

    res.json({
      ...dance,
      images: images.map((img) => ({ id: img.id, image: img.image })),
    });
  } catch (err) {
    console.error("[GET BY ID] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    console.log("[CREATE] Request body:", req.body);
    const { name, category, description } = req.body;

    const [result] = await db.query(
      "INSERT INTO dance (title, category, description) VALUES (?, ?, ?)",
      [name, category, description]
    );
    console.log("[CREATE] Insert result:", result);

    res.status(201).json({
      id: result.insertId,
      name,
      category,
      description,
    });
  } catch (err) {
    console.error("[CREATE] Error:", err);
    res.status(400).json({ message: err.message });
  }
};

exports.updatedance = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("[UPDATE DANCE] Params:", req.params);
    console.log("[UPDATE DANCE] Body:", req.body);

    const { title, category, description } = req.body;
    const danceId = req.params.id;

    const [result] = await connection.query(
      "UPDATE dance SET title=?,category=?, description=? WHERE id=?",
      [title, category, description, danceId]
    );
    console.log("[UPDATE DANCE] Update result:", result);

    if (result.affectedRows === 0) {
      console.warn("[UPDATE DANCE] Dance not found with id:", danceId);
      return res.status(404).json({ message: "dance not found" });
    }

    res.json({
      id: danceId,
      title,
      description,
      category,
      message: "dance updated successfully",
    });
  } catch (err) {
    console.error("[UPDATE DANCE] Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.deletedance = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("[DELETE DANCE] Params:", req.params);
    const danceId = req.params.id;

    await connection.beginTransaction();

    const [images] = await connection.query(
      "SELECT image FROM image_dance WHERE id_dance = ?",
      [danceId]
    );
    console.log("[DELETE DANCE] Images to delete:", images);

    await connection.query("DELETE FROM image_dance WHERE id_dance = ?", [
      danceId,
    ]);
    const [result] = await connection.query("DELETE FROM dance WHERE id = ?", [
      danceId,
    ]);
    console.log("[DELETE DANCE] Delete result:", result);

    if (result.affectedRows === 0) {
      await connection.rollback();
      console.warn("[DELETE DANCE] Dance not found with id:", danceId);
      return res.status(404).json({ message: "dance not found" });
    }

    await connection.commit();

    for (const img of images) {
      const relativePath = img.image.replace(/\\/g, "/");
      const filePath = path.resolve(__dirname, "../", relativePath);
      try {
        await fs.unlink(filePath);
        console.log("[DELETE DANCE] File deleted:", filePath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error(
            "[DELETE DANCE] Failed to delete file:",
            filePath,
            err.message
          );
        }
      }
    }

    res.json({ message: "dance and related images deleted successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("[DELETE DANCE] Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.updateSingleImage = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("[UPDATE IMAGE] Params:", req.params);
    console.log("[UPDATE IMAGE] Uploaded file:", req.file);

    const historyId = req.params.id;
    const imageId = req.params.imageId;
    const filename = "uploads/" + req.file.filename;

    const [rows] = await connection.query(
      "SELECT image FROM image_dance WHERE id=? AND id_dance=?",
      [imageId, historyId]
    );
    console.log("[UPDATE IMAGE] Old image rows:", rows);
    const oldImage = rows[0]?.image;

    const [result] = await connection.query(
      "UPDATE image_dance SET image=? WHERE id=?",
      [filename, imageId]
    );
    console.log("[UPDATE IMAGE] Update result:", result);

    if (result.affectedRows === 0) {
      console.warn("[UPDATE IMAGE] Image not found with id:", imageId);
      return res.status(404).json({ message: "Image not found" });
    }

    if (oldImage) {
      const oldPath = path.join(__dirname, "..", oldImage);
      try {
        await fs.unlink(oldPath);
        console.log("[UPDATE IMAGE] Old file deleted:", oldPath);
      } catch (e) {
        console.warn("[UPDATE IMAGE] Failed to delete old file:", e.message);
      }
    }

    res.json({ message: "Image updated successfully" });
  } catch (err) {
    console.error("[UPDATE IMAGE] Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.deleteSingleImage = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("[DELETE IMAGE] Params:", req.params);
    const historyId = req.params.id;
    const imageId = req.params.imageId;

    const [rows] = await connection.query(
      "SELECT image FROM image_dance WHERE id=? AND id_dance=?",
      [imageId, historyId]
    );
    console.log("[DELETE IMAGE] Old image rows:", rows);
    const oldImage = rows[0]?.image;

    if (oldImage) {
      const oldPath = path.join(__dirname, "..", oldImage);
      try {
        await fs.unlink(oldPath);
        console.log("[DELETE IMAGE] Old file deleted:", oldPath);
      } catch (e) {
        console.warn("[DELETE IMAGE] Failed to delete old file:", e.message);
      }
    }

    const [result] = await connection.query(
      "DELETE FROM image_dance WHERE id=?",
      [imageId]
    );
    console.log("[DELETE IMAGE] Delete result:", result);

    if (result.affectedRows === 0) {
      console.warn("[DELETE IMAGE] Image not found with id:", imageId);
      return res.status(404).json({ message: "Image not found" });
    }

    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    console.error("[DELETE IMAGE] Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.addImage = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("[ADD IMAGE] Params:", req.params);
    console.log("[ADD IMAGE] Uploaded file:", req.file);

    const danceId = req.params.id;
    const filename = "uploads/" + req.file.filename;

    const [result] = await connection.query(
      "INSERT INTO image_dance (id_dance, image) VALUES (?, ?)",
      [danceId, filename]
    );
    console.log("[ADD IMAGE] Insert result:", result);

    res.json({ message: "Image added successfully", id: result.insertId });
  } catch (err) {
    console.error("[ADD IMAGE] Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.getCategories = async (req, res) => {
  try {
    console.log("[GET CATEGORIES] Fetching categories...");
    const [categories] = await db.query("SELECT * FROM dance_category");
    console.log("[GET CATEGORIES] Result:", categories);

    res.json(categories);
  } catch (err) {
    console.error("[GET CATEGORIES] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    console.log("[CREATE CATEGORY] Request body:", req.body);

    const { name } = req.body;
    const [result] = await db.query(
      "INSERT INTO dance_category (name_category) VALUES (?)",
      [name]
    );
    console.log("[CREATE CATEGORY] Insert result:", result);

    res.status(201).json({
      id: result.insertId,
      name,
    });
  } catch (err) {
    console.error("[CREATE CATEGORY] Error:", err);
    res.status(400).json({ message: err.message });
  }
};
