const db = require("../config/db");
// const fs = require("fs");
const path = require("path");
const fs = require("fs").promises;

// GET all history + images
exports.getAll = async (req, res) => {
  try {
    const [tourist] = await db.query(
      `SELECT t.*, c.name_category 
       FROM tourist t 
       INNER JOIN tourist_category c ON t.category = c.id 
       ORDER BY t.id DESC`
    );
    const [images] = await db.query("SELECT * FROM image_tourist");

    const data = tourist.map((item) => ({
      ...item,
      images: images
        .filter((img) => img.id_tourist === item.id)
        .map((img) => ({ id: img.id, image: img.image })),
    }));

    console.log("[GET ALL TOURIST] Total:", data.length);
    res.json(data);
  } catch (err) {
    console.error("[GET ALL TOURIST] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllPart = async (req, res) => {
  try {
    const [tourist] = await db.query(
      `SELECT t.*, c.name_category 
       FROM tourist t 
       INNER JOIN tourist_category c ON t.category = c.id 
       ORDER BY t.id DESC
       LIMIT 4`
    );
    const [images] = await db.query("SELECT * FROM image_tourist");

    const data = tourist.map((item) => ({
      ...item,
      images: images
        .filter((img) => img.id_tourist === item.id)
        .map((img) => ({ id: img.id, image: img.image })),
    }));

    console.log("[GET ALL PART TOURIST] Total:", data.length);
    res.json(data);
  } catch (err) {
    console.error("[GET ALL PART TOURIST] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const [tourists] = await db.query(
      `SELECT t.*, c.name_category 
       FROM tourist t 
       INNER JOIN tourist_category c ON t.category = c.id 
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (tourists.length === 0) {
      return res.status(404).json({ message: "Tourist not found" });
    }

    const tourist = tourists[0];
    const [images] = await db.query(
      "SELECT * FROM image_tourist WHERE id_tourist = ?",
      [tourist.id]
    );

    res.json({
      ...tourist,
      images: images.map((img) => ({ id: img.id, image: img.image })),
    });
  } catch (err) {
    console.error("[GET TOURIST BY ID] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


exports.create = async (req, res) => {
  try {
    const { title, category, description } = req.body;

    const [result] = await db.query(
      "INSERT INTO tourist (title, category, description) VALUES (?, ?, ?)",
      [title, category, description]
    );

    res.status(201).json({
      id: result.insertId,
      title,
      category,
      description,
    });
  } catch (err) {
    console.error("[CREATE TOURIST] Error:", err);
    res.status(400).json({ message: err.message || "Failed to create tourist" });
  }
};

exports.updatetourist = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { title, category, description } = req.body;
    const touristId = req.params.id;

    const [result] = await connection.query(
      "UPDATE tourist SET title=?, category=?, description=? WHERE id=?",
      [title, category, description, touristId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Tourist not found" });
    }

    res.json({
      id: touristId,
      title,
      category,
      description,
      message: "Tourist updated successfully",
    });
  } catch (err) {
    console.error("[UPDATE TOURIST] Error:", err);
    res.status(500).json({ message: err.message || "Failed to update tourist" });
  } finally {
    connection.release();
  }
};

exports.deletetourist = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const touristId = req.params.id;
    await connection.beginTransaction();

    // Cari semua filename gambar
    const [images] = await connection.query(
      "SELECT image FROM image_tourist WHERE id_tourist = ?",
      [touristId]
    );

    await connection.query("DELETE FROM image_tourist WHERE id_tourist = ?", [touristId]);
    const [result] = await connection.query("DELETE FROM tourist WHERE id = ?", [touristId]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Tourist not found" });
    }

    await connection.commit();

    // Hapus file di storage
    for (const img of images) {
      const relativePath = img.image.replace(/\\/g, "/");
      const filePath = path.resolve(__dirname, "../", relativePath);
      try {
        await fs.unlink(filePath);
        console.log("[DELETE FILE] Success:", filePath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error("[DELETE FILE] Failed:", filePath, "-", err.message);
        }
      }
    }

    res.json({ message: "Tourist and related images deleted successfully" });
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error("[DELETE TOURIST] Rollback failed:", rollbackErr.message);
    }
    console.error("[DELETE TOURIST] Error:", err);
    res.status(500).json({ message: err.message || "Failed to delete tourist" });
  } finally {
    connection.release();
  }
};

exports.updateSingleImage = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const touristId = req.params.id;
    const imageId = req.params.imageId;
    const filename = "uploads/" + req.file.filename;

    console.info("[UPDATE IMAGE] New file:", filename, "For imageId:", imageId, "touristId:", touristId);

    // Cari file lama
    const [rows] = await connection.query(
      "SELECT image FROM image_tourist WHERE id=? AND id_tourist=?",
      [imageId, touristId]
    );
    const oldImage = rows[0]?.image;

    console.info("[UPDATE IMAGE] Old file to remove:", oldImage);

    // Update DB
    const [result] = await connection.query(
      "UPDATE image_tourist SET image=? WHERE id=?",
      [filename, imageId]
    );

    if (result.affectedRows === 0) {
      console.warn("[UPDATE IMAGE] Image not found, id:", imageId);
      return res.status(404).json({ message: "Image not found" });
    }

    // Hapus file lama
    if (oldImage) {
      const oldPath = path.join(__dirname, "..", oldImage);
      try {
        await fs.unlink(oldPath);
        console.info("[UPDATE IMAGE] Old file deleted:", oldPath);
      } catch (e) {
        console.warn("[UPDATE IMAGE] Failed to delete old file:", oldPath, "-", e.message);
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
    const touristId = req.params.id;
    const imageId = req.params.imageId;

    console.info("[DELETE IMAGE] Delete imageId:", imageId, "from touristId:", touristId);

    // Cari file lama
    const [rows] = await connection.query(
      "SELECT image FROM image_tourist WHERE id=? AND id_tourist=?",
      [imageId, touristId]
    );
    const oldImage = rows[0]?.image;

    console.info("[DELETE IMAGE] Old file to remove:", oldImage);

    // Hapus file lama
    if (oldImage) {
      const oldPath = path.join(__dirname, "..", oldImage);
      try {
        await fs.unlink(oldPath);
        console.info("[DELETE IMAGE] Old file deleted:", oldPath);
      } catch (e) {
        console.warn("[DELETE IMAGE] Failed to delete old file:", oldPath, "-", e.message);
      }
    }

    // Delete record di DB
    const [result] = await connection.query(
      "DELETE FROM image_tourist WHERE id=?",
      [imageId]
    );

    if (result.affectedRows === 0) {
      console.warn("[DELETE IMAGE] Image not found, id:", imageId);
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
    const touristId = req.params.id;
    const filename = "uploads/" + req.file.filename;

    console.info("[ADD IMAGE] Adding image:", filename, "to touristId:", touristId);

    await connection.query(
      "INSERT INTO image_tourist (id_tourist, image) VALUES (?, ?)",
      [touristId, filename]
    );

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
    console.info("[GET CATEGORIES] Fetching categories");
    const [categories] = await db.query("SELECT * FROM tourist_category");

    console.info("[GET CATEGORIES] Fetched count:", categories.length);
    res.json(categories);
  } catch (err) {
    console.error("[GET CATEGORIES] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    console.info("[CREATE CATEGORY] Creating category with name:", name);

    const [result] = await db.query(
      "INSERT INTO tourist_category (name_category) VALUES (?)",
      [name]
    );

    console.info("[CREATE CATEGORY] Created category id:", result.insertId);
    res.status(201).json({
      id: result.insertId,
      name,
    });
  } catch (err) {
    console.error("[CREATE CATEGORY] Error:", err);
    res.status(400).json({ message: err.message });
  }
};
