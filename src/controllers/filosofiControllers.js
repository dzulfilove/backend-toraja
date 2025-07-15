const db = require("../config/db");
// const fs = require("fs");
const path = require("path");
const fs = require("fs").promises;

// GET all history + images
exports.getAll = async (req, res) => {
  try {
    console.log("[GET ALL PHILOSOPHY] Fetching all philosophies...");
    const [philosophy] = await db.query("SELECT philosophy.* FROM philosophy");
    console.log("[GET ALL PHILOSOPHY] Result:", philosophy);

    res.json(philosophy);
  } catch (err) {
    console.error("[GET ALL PHILOSOPHY] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getAllPart = async (req, res) => {
  try {
    console.log("[GET PART PHILOSOPHY] Fetching first 4 philosophies...");
    const [philosophy] = await db.query(
      "SELECT philosophy.* FROM philosophy LIMIT 4"
    );
    console.log("[GET PART PHILOSOPHY] Result:", philosophy);

    res.json(philosophy);
  } catch (err) {
    console.error("[GET PART PHILOSOPHY] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    console.log("[GET PHILOSOPHY BY ID] Params:", req.params);
    const [philosophys] = await db.query(
      "SELECT * FROM philosophy WHERE id = ?",
      [req.params.id]
    );
    console.log("[GET PHILOSOPHY BY ID] Result:", philosophys);

    if (philosophys.length === 0) {
      console.warn(
        "[GET PHILOSOPHY BY ID] Philosophy not found with id:",
        req.params.id
      );
      return res.status(404).json({ message: "Not found" });
    }

    const philosophy = philosophys[0];
    res.json(philosophy);
  } catch (err) {
    console.error("[GET PHILOSOPHY BY ID] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    console.log("[CREATE PHILOSOPHY] Request body:", req.body);
    const { name, description } = req.body;

    const [result] = await db.query(
      "INSERT INTO philosophy (title, description) VALUES (?, ?)",
      [name, description]
    );
    console.log("[CREATE PHILOSOPHY] Insert result:", result);

    res.status(201).json({
      id: result.insertId,
      name,
      description,
    });
  } catch (err) {
    console.error("[CREATE PHILOSOPHY] Error:", err);
    res.status(400).json({ message: err.message });
  }
};

exports.updatePhilosophy = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { title, description } = req.body;
    const philosophyId = req.params.id;

    console.log("[UPDATE PHILOSOPHY] Params:", req.params);
    console.log("[UPDATE PHILOSOPHY] Body:", req.body);

    const [result] = await connection.query(
      "UPDATE philosophy SET title=?, description=? WHERE id=?",
      [title, description, philosophyId]
    );

    console.log("[UPDATE PHILOSOPHY] Query result:", result);

    if (result.affectedRows === 0) {
      console.warn(
        "[UPDATE PHILOSOPHY] Philosophy not found with id:",
        philosophyId
      );
      return res.status(404).json({ message: "Philosophy not found" });
    }

    res.json({
      id: philosophyId,
      title,
      description,
      message: "Philosophy updated successfully",
    });
  } catch (err) {
    console.error("[UPDATE PHILOSOPHY] Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.deletePhilosophy = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const philosophyId = req.params.id;
    console.log("[DELETE PHILOSOPHY] Params:", req.params);

    await connection.beginTransaction();

    const [result] = await connection.query(
      "DELETE FROM philosophy WHERE id = ?",
      [philosophyId]
    );
    console.log("[DELETE PHILOSOPHY] Delete result:", result);

    if (result.affectedRows === 0) {
      await connection.rollback();
      console.warn(
        "[DELETE PHILOSOPHY] Philosophy not found with id:",
        philosophyId
      );
      return res.status(404).json({ message: "Philosophy not found" });
    }

    await connection.commit();
    res.json({ message: "Philosophy deleted successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("[DELETE PHILOSOPHY] Error:", err);
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

    console.log("[UPDATE SINGLE IMAGE] Params:", req.params);
    console.log("[UPDATE SINGLE IMAGE] File:", req.file);

    const [rows] = await connection.query(
      "SELECT image FROM image_food WHERE id=? AND id_food=?",
      [imageId, historyId]
    );
    const oldImage = rows[0]?.image;
    console.log("[UPDATE SINGLE IMAGE] Old image:", oldImage);

    const [result] = await connection.query(
      "UPDATE image_food SET image=? WHERE id=?",
      [filename, imageId]
    );
    console.log("[UPDATE SINGLE IMAGE] Update result:", result);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    if (oldImage) {
      const oldPath = path.join(__dirname, "..", oldImage);
      try {
        await fs.unlink(oldPath);
        console.log("[UPDATE SINGLE IMAGE] Old file deleted:", oldPath);
      } catch (e) {
        console.warn(
          "[UPDATE SINGLE IMAGE] Failed to delete old file:",
          e.message
        );
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

    const [rows] = await connection.query(
      "SELECT image FROM image_food WHERE id=? AND id_food=?",
      [imageId, historyId]
    );
    const oldImage = rows[0]?.image;
    console.log("[DELETE SINGLE IMAGE] Old image:", oldImage);

    if (oldImage) {
      const oldPath = path.join(__dirname, "..", oldImage);
      try {
        await fs.unlink(oldPath);
        console.log("[DELETE SINGLE IMAGE] Old file deleted:", oldPath);
      } catch (e) {
        console.warn(
          "[DELETE SINGLE IMAGE] Failed to delete old file:",
          e.message
        );
      }
    }

    const [result] = await connection.query(
      "DELETE FROM image_food WHERE id=?",
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
    console.log("[ADD IMAGE] Params:", req.params);
    console.log("[ADD IMAGE] File:", req.file);

    const foodId = req.params.id;
    const filename = "uploads/" + req.file.filename;

    const [result] = await connection.query(
      "INSERT INTO image_food (id_food, image) VALUES (?, ?)",
      [foodId, filename]
    );
    console.log("[ADD IMAGE] Insert result:", result);

    res.json({ message: "Image added successfully" });
  } catch (err) {
    console.error("[ADD IMAGE] Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.getCategories = async (req, res) => {
  try {
    console.log("[GET FOOD CATEGORIES] Fetching categories...");
    const [categories] = await db.query("SELECT * FROM food_category");
    console.log("[GET FOOD CATEGORIES] Result:", categories);

    res.json(categories);
  } catch (err) {
    console.error("[GET FOOD CATEGORIES] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    console.log("[CREATE CATEGORY] Body:", req.body);

    const { name } = req.body;
    const [result] = await db.query(
      "INSERT INTO food_category (name_category) VALUES (?)",
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
