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
    const [foods] = await db.query("SELECT * FROM food WHERE id = ?", [
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
      "INSERT INTO food (name, category, description) VALUES (?, ?, ?)",

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

exports.update = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const foodId = req.params.id;
    const { name, category, description } = req.body;

    let filename = null;
    if (req.file) {
      filename = "uploads/" + req.file.filename;

      // Ambil image lama untuk dihapus
      const [rows] = await connection.query(
        "SELECT image FROM food WHERE id=?",
        [foodId]
      );
      const oldImage = rows[0]?.image;

      // Update data + image
      const [result] = await connection.query(
        "UPDATE food SET name=?, category=?, description=?, image=? WHERE id=?",
        [name, category, description, filename, foodId]
      );

      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Food not found" });

      // Hapus file lama
      if (oldImage) {
        const oldPath = path.join(__dirname, "..", oldImage);
        try {
          await fs.unlink(oldPath);
        } catch (e) {
          console.warn("Failed to delete old image:", e.message);
        }
      }

      res.json({
        id: foodId,
        name,
        category,
        description,
        image: filename,
        message: "Food and image updated successfully",
      });
    } else {
      // Hanya update data (tanpa image)
      const [result] = await connection.query(
        "UPDATE food SET name=?, category=?, description=? WHERE id=?",
        [name, category, description, foodId]
      );

      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Food not found" });

      res.json({
        id: foodId,
        name,
        category,
        description,
        message: "Food updated successfully",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

// DELETE food by id
exports.delete = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const foodId = req.params.id;

    // Ambil nama file image dulu
    const [rows] = await connection.query("SELECT image FROM food WHERE id=?", [
      foodId,
    ]);
    const oldImage = rows[0]?.image;

    // Hapus dari DB
    const [result] = await connection.query("DELETE FROM food WHERE id=?", [
      foodId,
    ]);

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Food not found" });

    // Hapus file image
    if (oldImage) {
      const oldPath = path.join(__dirname, "..", oldImage);
      try {
        await fs.unlink(oldPath);
      } catch (e) {
        console.warn("Failed to delete image file:", e.message);
      }
    }

    res.json({ message: "Food deleted successfully" });
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
