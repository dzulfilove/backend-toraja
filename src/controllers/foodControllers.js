const db = require("../config/db");
// const fs = require("fs");
const path = require("path");
const fs = require("fs").promises;

// GET all food + images
exports.getAll = async (req, res) => {
  try {
    console.log(
      "[GET ALL FOOD] Start fetching all food with categories and images"
    );

    const [food] = await db.query(
      "SELECT food.*, food_category.name_category FROM food INNER JOIN food_category ON food.category = food_category.id"
    );
    console.log("[GET ALL FOOD] Food rows:", food);

    const [images] = await db.query("SELECT * FROM image_food");
    console.log("[GET ALL FOOD] Image rows:", images);

    const data = food.map((item) => ({
      ...item,
      images: images
        .filter((img) => img.id_food === item.id)
        .map((img) => ({ id: img.id, image: img.image })),
    }));

    console.log("[GET ALL FOOD] Final combined data:", data);
    res.json(data);
  } catch (err) {
    console.error("[GET ALL FOOD] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET part of food (limit 4)
exports.getAllPart = async (req, res) => {
  try {
    console.log("[GET PART FOOD] Start fetching part of food (limit 4)");

    const [food] = await db.query(
      "SELECT food.*, food_category.name_category FROM food INNER JOIN food_category ON food.category = food_category.id LIMIT 4"
    );
    console.log("[GET PART FOOD] Food rows:", food);

    const [images] = await db.query("SELECT * FROM image_food");
    console.log("[GET PART FOOD] Image rows:", images);

    const data = food.map((item) => ({
      ...item,
      images: images
        .filter((img) => img.id_food === item.id)
        .map((img) => ({ id: img.id, image: img.image })),
    }));

    console.log("[GET PART FOOD] Final combined data:", data);
    res.json(data);
  } catch (err) {
    console.error("[GET PART FOOD] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET food by ID
exports.getById = async (req, res) => {
  try {
    console.log("[GET FOOD BY ID] Params:", req.params);

    const [foods] = await db.query(
      "SELECT food.*, food_category.name_category FROM food INNER JOIN food_category ON food.category = food_category.id WHERE food.id = ?",
      [req.params.id]
    );
    console.log("[GET FOOD BY ID] Query result:", foods);

    if (foods.length === 0) {
      console.warn("[GET FOOD BY ID] Food not found with id:", req.params.id);
      return res.status(404).json({ message: "Not found" });
    }

    const food = foods[0];

    const [images] = await db.query(
      "SELECT * FROM image_food WHERE id_food = ?",
      [food.id]
    );
    console.log("[GET FOOD BY ID] Related images:", images);

    res.json({
      ...food,
      images: images.map((img) => ({ id: img.id, image: img.image })),
    });
  } catch (err) {
    console.error("[GET FOOD BY ID] Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// CREATE food
exports.create = async (req, res) => {
  try {
    console.log("[CREATE FOOD] Start: Body received:", req.body);

    const { name, category, description } = req.body;

    console.log(
      `[CREATE FOOD] Inserting: name="${name}", category="${category}", description="${description}"`
    );

    const [result] = await db.query(
      "INSERT INTO food (title, category, description) VALUES (?, ?, ?)",
      [name, category, description]
    );

    console.log("[CREATE FOOD] DB insert result:", result);

    res.status(201).json({
      id: result.insertId,
      name,
      category,
      description,
    });
  } catch (err) {
    console.error("[CREATE FOOD] Error:", err);
    res.status(400).json({ message: err.message });
  }
};

exports.updateFood = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("[UPDATE FOOD] Params:", req.params, "Body:", req.body);

    
    const { title, category, description } = req.body;
    const foodId = req.params.id;

    const [result] = await connection.query(
      "UPDATE food SET title=?, category=?, description=? WHERE id=?",
      [title, category, description, foodId]
    );

    console.log("[UPDATE FOOD] Query result:", result);

    if (result.affectedRows === 0) {
      console.warn("[UPDATE FOOD] Food not found with id:", foodId);
      return res.status(404).json({ message: "Food not found" });
    }

    res.json({
      id: foodId,
      title,
      description,
      category,
      message: "Food updated successfully",
    });
  } catch (err) {
    console.error("[UPDATE FOOD] Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.deleteFood = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("[DELETE FOOD] Params:", req.params);
    const foodId = req.params.id;

    await connection.beginTransaction();

    const [images] = await connection.query(
      "SELECT image FROM image_food WHERE id_food = ?",
      [foodId]
    );
    console.log("[DELETE FOOD] Related images:", images);

    await connection.query("DELETE FROM image_food WHERE id_food = ?", [
      foodId,
    ]);

    const [result] = await connection.query("DELETE FROM food WHERE id = ?", [
      foodId,
    ]);
    console.log("[DELETE FOOD] Delete food result:", result);

    if (result.affectedRows === 0) {
      await connection.rollback();
      console.warn("[DELETE FOOD] Food not found, rollback transaction");
      return res.status(404).json({ message: "Food not found" });
    }

    await connection.commit();

    // Hapus file fisik
    for (const img of images) {
      const relativePath = img.image.replace(/\\/g, "/");
      const filePath = path.resolve(__dirname, "../", relativePath);
      try {
        await fs.unlink(filePath);
        console.log("[DELETE FOOD] File deleted:", filePath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error(
            "[DELETE FOOD] Failed to delete file:",
            filePath,
            "Error:",
            err.message
          );
        } else {
          console.warn("[DELETE FOOD] File not found, skip:", filePath);
        }
      }
    }

    res.json({ message: "Food and related images deleted successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("[DELETE FOOD] Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.updateSingleImage = async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log("[UPDATE IMAGE] Params:", req.params, "File:", req.file);

    const historyId = req.params.id;
    const imageId = req.params.imageId;
    const filename = "uploads/" + req.file.filename;

    const [rows] = await connection.query(
      "SELECT image FROM image_food WHERE id=? AND id_food=?",
      [imageId, historyId]
    );
    const oldImage = rows[0]?.image;
    console.log("[UPDATE IMAGE] Old image path:", oldImage);

    const [result] = await connection.query(
      "UPDATE image_food SET image=? WHERE id=?",
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
      "SELECT image FROM image_food WHERE id=? AND id_food=?",
      [imageId, historyId]
    );
    const oldImage = rows[0]?.image;
    console.log("[DELETE IMAGE] Old image path:", oldImage);

    if (oldImage) {
      const oldPath = path.join(__dirname, "..", oldImage);
      try {
        await fs.unlink(oldPath);
        console.log("[DELETE IMAGE] File deleted:", oldPath);
      } catch (e) {
        console.warn("[DELETE IMAGE] Failed to delete old file:", e.message);
      }
    }

    const [result] = await connection.query(
      "DELETE FROM image_food WHERE id=?",
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
    console.log("[ADD IMAGE] Start: Params:", req.params);
    if (!req.file) {
      console.warn("[ADD IMAGE] No file uploaded!");
      return res.status(400).json({ message: "No file uploaded" });
    }

    const foodId = req.params.id;
    const filename = "uploads/" + req.file.filename;

    console.log(
      `[ADD IMAGE] Saving to DB: foodId=${foodId}, filename=${filename}`
    );

    const [result] = await connection.query(
      "INSERT INTO image_food (id_food, image) VALUES (?, ?)",
      [foodId, filename]
    );
    console.log("[ADD IMAGE] DB insert result:", result);

    res.json({
      message: "Image added successfully",
      insertId: result.insertId,
    });
  } catch (err) {
    console.error("[ADD IMAGE] Error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    connection.release();
  }
};

exports.getCategories = async (req, res) => {
  try {
    console.log("[GET CATEGORIES] Start fetching categories");
    const [categories] = await db.query("SELECT * FROM food_category");
    console.log("[GET CATEGORIES] Result:", categories);
    res.json(categories);
  } catch (err) {
    console.error("[GET CATEGORIES] Error:", err);
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
