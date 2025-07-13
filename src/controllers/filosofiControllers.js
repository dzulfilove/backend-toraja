const db = require("../config/db");
// const fs = require("fs");
const path = require("path");
const fs = require("fs").promises;

// GET all history + images
exports.getAll = async (req, res) => {
  try {
    const [philosophy] = await db.query(
      "SELECT philosophy.* FROM philosophy"
    );
    // const [images] = await db.query("SELECT * FROM image_food");

    // const data = food.map((food) => ({
    //   ...food,
    //   images: images
    //     .filter((img) => img.id_food === food.id)
    //     .map((img) => ({ id: img.id, image: img.image })),
    // }));

    console.log(philosophy, "data ");
    res.json(philosophy);
  } catch (err) {
    console.error(err); // debug cepat
    res.status(500).json({ message: err.message });
  }
};

exports.getAllPart = async (req, res) => {
  try {
    const [philosophy] = await db.query(
      "SELECT philosophy.* FROM philosophy limit 4"
    );
    // const [images] = await db.query("SELECT * FROM image_food");

    // const data = food.map((food) => ({
    //   ...food,
    //   images: images
    //     .filter((img) => img.id_food === food.id)
    //     .map((img) => ({ id: img.id, image: img.image })),
    // }));

    console.log(philosophy, "data ");
    res.json(philosophy);
  } catch (err) {
    console.error(err); // debug cepat
    res.status(500).json({ message: err.message });
  }
};
exports.getById = async (req, res) => {
  try {
    const [philosophys] = await db.query("SELECT * FROM philosophy WHERE id = ?", [
      req.params.id,
    ]);
    if (philosophys.length === 0)
      return res.status(404).json({ message: "Not found" });

    const philosophy = philosophys[0];
    // const [images] = await db.query(
    //   "SELECT * FROM image_food WHERE id_food = ?",
    //   [food.id]
    // );

    res.json(philosophy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description } = req.body;

    const [result] = await db.query(
      "INSERT INTO philosophy (title, description) VALUES (?, ?)",

      [name, description]
    );
    res.status(201).json({
      id: result.insertId,
      name,
    
      description,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

exports.updatePhilosophy = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { title, description } = req.body;
    const philosophyId = req.params.id;

    const [result] = await connection.query(
      "UPDATE philosophy SET title=?, description=? WHERE id=?",
      [title, description, philosophyId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "food not found" });

    res.json({
      id: philosophyId,
      title,
      description,
    
      message: "food updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.deletePhilosophy = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const philosophyId = req.params.id;

    await connection.beginTransaction();

    // Ambil filename
    // const [images] = await connection.query(
    //   "SELECT image FROM image_food WHERE id_food = ?",
    //   [philosophyId]
    // );

    // await connection.query("DELETE FROM image_food WHERE id_food = ?", [
    //   philosophyId,
    // ]);
    const [philosophy] = await connection.query("DELETE FROM philosophy WHERE id = ?", [
      philosophyId,
    ]);

    if (philosophy.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Food not found" });
    }

    await connection.commit();

    // Hapus file fisik
    // for (const img of images) {
    //   // Kalau field image = "uploads/xxx.jpg"
    //   const relativePath = img.image.replace(/\\/g, "/");
    //   const filePath = path.resolve(__dirname, "../", relativePath);
    //   try {
    //     await fs.unlink(filePath);
    //     console.log("File terhapus:", filePath);
    //   } catch (err) {
    //     if (err.code !== "ENOENT") {
    //       // abaikan kalau file memang tidak ada
    //       console.error("Gagal hapus file:", filePath, err.message);
    //     }
    //   }
    // }

    res.json({ message: "philosophy and related images deleted successfully" });
  } catch (err) {
    await connection.rollback();
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
      "SELECT image FROM image_food WHERE id=? AND id_food=?",
      [imageId, historyId]
    );
    const oldImage = rows[0]?.image;

    // Update DB
    const [result] = await connection.query(
      "UPDATE image_food SET image=? WHERE id=?",
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

exports.deleteSingleImage = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const historyId = req.params.id;
    const imageId = req.params.imageId;
    // Cari file lama
    const [rows] = await connection.query(
      "SELECT image FROM image_food WHERE id=? AND id_food=?",
      [imageId, historyId]
    );
    const oldImage = rows[0]?.image;

    // Hapus file lama
    if (oldImage) {
      const oldPath = path.join(__dirname, "..", oldImage);
      try {
        await fs.unlink(oldPath);
      } catch (e) {
        console.log("Gagal hapus file lama:", e.message);
      }
    }

    // Update DB
    const [result] = await connection.query(
      "delete from image_food WHERE id=?",
      [imageId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Image not found" });
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
    console.log(req.file);
    const foodId = req.params.id;
    const filename = "uploads/" + req.file.filename;

    await connection.query(
      "INSERT INTO image_food (id_food, image) VALUES (?, ?)",
      [foodId, filename]
    );

    res.json({ message: "Image added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.getCategories = async (req, res) => {
  try {
    const [categories] = await db.query("SELECT * FROM food_category");

    res.json(categories);
  } catch (err) {
    console.error(err); // debug cepat
    res.status(500).json({ message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    console.log(req.body, "bodyy");

    const { name } = req.body;
    const [result] = await db.query(
      "INSERT INTO food_category (name_category) VALUES (?)",

      [name]
    );
    res.status(201).json({
      id: result.insertId,
      name,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};
