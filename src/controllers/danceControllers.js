const db = require("../config/db");
// const fs = require("fs");
const path = require("path");
const fs = require("fs").promises;

// GET all history + images
exports.getAll = async (req, res) => {
  try {
    const [dance] = await db.query(
      "SELECT dance.*, dance_category.name_category FROM dance inner join dance_category on dance.category = dance_category.id"
    );
    const [images] = await db.query("SELECT * FROM image_dance");

    const data = dance.map((dance) => ({
      ...dance,
      images: images
        .filter((img) => img.id_dance === dance.id)
        .map((img) => ({ id: img.id, image: img.image })),
    }));

    console.log(data, "data ");
    res.json(data);
  } catch (err) {
    console.error(err); // debug cepat
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const [dances] = await db.query("SELECT * FROM dance WHERE id = ?", [
      req.params.id,
    ]);
    if (dances.length === 0)
      return res.status(404).json({ message: "Not found" });

    const dance = dances[0];
    const [images] = await db.query(
      "SELECT * FROM image_dance WHERE id_dance = ?",
      [dance.id]
    );

    res.json({
      ...dance,
      images: images.map((img) => ({ id: img.id, image: img.image })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// // CREATE new history
// exports.create = async (req, res) => {
//   const connection = await db.getConnection();
//   console.log("BODY:", req.body);

//   try {
//     const { name, category, description } = req.body;
//     if (!req.file) {
//       return res.status(400).json({ message: "Image file is required" });
//     }

//     const filename = req.file.filename;
//     const baseUrl = `${req.protocol}://${req.get("host")}`;
//     const imageUrl = `uploads/${filename}`;

//     if (!name || !category || !description) {
//       return res.status(400).json({ message: "Incomplete data" });
//     }

//     const [result] = await connection.query(
//       "INSERT INTO dance (name, category, description, image) VALUES (?, ?, ?, ?)",
//       [name, category, description, imageUrl]
//     );

//     res.status(201).json({
//       id: result.insertId,
//       name,
//       category,
//       description,
//       image: imageUrl,
//       message: "dance created successfully",
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(400).json({ message: err.message });
//   } finally {
//     connection.release();
//   }
// };

exports.create = async (req, res) => {
  try {
    const { name, category, description } = req.body;

    const [result] = await db.query(
      "INSERT INTO dance (title, category, description) VALUES (?, ?, ?)",

      [name, category, description]
    );
    res.status(201).json({
      id: result.insertId,
      name,
      category,
      description,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

exports.updatedance = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { title, category, description } = req.body;
    const danceId = req.params.id;

    const [result] = await connection.query(
      "UPDATE dance SET title=?,category=?, description=? WHERE id=?",
      [title, category, description, danceId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "dance not found" });

    res.json({
      id: danceId,
      title,
      description,
      category,
      message: "dance updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.deletedance = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const danceId = req.params.id;

    await connection.beginTransaction();

    // Ambil filename
    const [images] = await connection.query(
      "SELECT image FROM image_dance WHERE id_dance = ?",
      [danceId]
    );

    await connection.query("DELETE FROM image_dance WHERE id_dance = ?", [
      danceId,
    ]);
    const [result] = await connection.query("DELETE FROM dance WHERE id = ?", [
      danceId,
    ]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "dance not found" });
    }

    await connection.commit();

    // Hapus file fisik
    for (const img of images) {
      // Kalau field image = "uploads/xxx.jpg"
      const relativePath = img.image.replace(/\\/g, "/");
      const filePath = path.resolve(__dirname, "../", relativePath);
      try {
        await fs.unlink(filePath);
        console.log("File terhapus:", filePath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          // abaikan kalau file memang tidak ada
          console.error("Gagal hapus file:", filePath, err.message);
        }
      }
    }

    res.json({ message: "dance and related images deleted successfully" });
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
      "SELECT image FROM image_dance WHERE id=? AND id_dance=?",
      [imageId, historyId]
    );
    const oldImage = rows[0]?.image;

    // Update DB
    const [result] = await connection.query(
      "UPDATE image_dance SET image=? WHERE id=?",
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
      "SELECT image FROM image_dance WHERE id=? AND id_dance=?",
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
      "delete from image_dance WHERE id=?",
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
    const danceId = req.params.id;
    const filename = "uploads/" + req.file.filename;

    await connection.query(
      "INSERT INTO image_dance (id_dance, image) VALUES (?, ?)",
      [danceId, filename]
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
    const [categories] = await db.query("SELECT * FROM dance_category");

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
      "INSERT INTO dance_category (name_category) VALUES (?)",

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
