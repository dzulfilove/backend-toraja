const express = require("express");
const router = express.Router();
const foodController = require("../controllers/foodControllers");
const upload = require("../middleware/upload"); // import middleware upload
const { auth } = require("../middleware/authMiddleware");

// GET all food
router.get("/part",foodController.getAllPart);

router.get("/", foodController.getAll);
router.get("/categories", foodController.getCategories);

// GET food by id
router.get("/:id", foodController.getById);

// CREATE new food (with single image upload)
router.post("/", auth, foodController.create);

// UPDATE food data
router.put("/:id", auth, foodController.updateFood);

router.put(
  "/:id/image/:imageId",
  auth,
  upload.single("image"),
  foodController.updateSingleImage
);

router.delete(
  "/:id/image/:imageId",
  auth,
  upload.single("image"),
  foodController.deleteSingleImage
);
router.post(
  "/:id/image",
  auth,
  upload.single("image"),
  foodController.addImage
);

// DELETE food
router.delete("/:id", auth, foodController.deleteFood);

router.post(
  "/category",
  auth,
  foodController.createCategory
);

module.exports = router;
