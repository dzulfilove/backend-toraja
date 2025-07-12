const db = require("../config/db");
// const fs = require("fs");
const path = require("path");
const fs = require("fs").promises;

// GET all history + images
exports.getAll = async (req, res) => {
  try {
    const [food] = await db.query(
      "SELECT food.*, food_category.name_category FROM food inner join food_category on food.category = food_category.id"
    );
    const [images] = await db.query("SELECT * FROM image_food");

    const data = food.map((food) => ({
      ...food,
      images: images
        .filter((img) => img.id_food === food.id)
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
    const [foods] = await db.query("SELECT food.*, food_category.name_category FROM food inner join food_category on food.category = food_category.id WHERE food.id = ?", [
      req.params.id,
    ]);
    if (foods.length === 0)
      return res.status(404).json({ message: "Not found" });

    const food = foods[0];
    const [images] = await db.query(
      "SELECT * FROM image_food WHERE id_food = ?",
      [food.id]
    );

    res.json({
      ...food,
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
//       "INSERT INTO food (name, category, description, image) VALUES (?, ?, ?, ?)",
//       [name, category, description, imageUrl]
//     );

//     res.status(201).json({
//       id: result.insertId,
//       name,
//       category,
//       description,
//       image: imageUrl,
//       message: "Food created successfully",
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
      "INSERT INTO food (title, category, description) VALUES (?, ?, ?)",

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

exports.updateFood = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { title, category, description } = req.body;
    const foodId = req.params.id;

    const [result] = await connection.query(
      "UPDATE food SET title=?,category=?, description=? WHERE id=?",
      [title, category, description, foodId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "food not found" });

    res.json({
      id: foodId,
      title,
      description,
      category,
      message: "food updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.deleteFood = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const foodId = req.params.id;

    await connection.beginTransaction();

    // Ambil filename
    const [images] = await connection.query(
      "SELECT image FROM image_food WHERE id_food = ?",
      [foodId]
    );

    await connection.query("DELETE FROM image_food WHERE id_food = ?", [
      foodId,
    ]);
    const [result] = await connection.query("DELETE FROM food WHERE id = ?", [
      foodId,
    ]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Food not found" });
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

    res.json({ message: "Food and related images deleted successfully" });
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
