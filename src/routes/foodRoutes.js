const express = require("express");
const router = express.Router();
const foodController = require("../controllers/foodControllers");
const upload = require("../middleware/upload"); // import middleware upload
const { auth } = require("../middleware/authMiddleware");

// GET all food
router.get("/", auth, foodController.getAll);
router.get("/categories", auth, foodController.getCategories);

// GET food by id
router.get("/:id", auth, foodController.getById);

// CREATE new food (with single image upload)
router.post("/", auth, upload.single("image"), foodController.create);

// UPDATE food data + optional replace image
router.put("/:id", auth, upload.single("image"), foodController.update);

router.post("/:id/image", auth, upload.single("image"), foodController.addImage);

// DELETE food
router.delete("/:id", auth, foodController.delete);

module.exports = router;
