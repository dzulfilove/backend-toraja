const express = require("express");
const router = express.Router();
const filosofiController = require("../controllers/filosofiControllers");
const upload = require("../middleware/upload"); // import middleware upload
const { auth } = require("../middleware/authMiddleware");

// GET all food
router.get("/", filosofiController.getAll);
// router.get("/categories", filosofiController.getCategories);

// GET food by id
router.get("/:id", filosofiController.getById);

// CREATE new food (with single image upload)
router.post("/", auth, upload.single("image"), filosofiController.create);

// UPDATE food data
router.put("/:id", auth, upload.single("image"), filosofiController.updatePhilosophy);

// router.put(
//   "/:id/image/:imageId",
//   auth,
//   upload.single("image"),
//   filosofiController.updateSingleImage
// );

// router.delete(
//   "/:id/image/:imageId",
//   auth,
//   upload.single("image"),
//   filosofiController.deleteSingleImage
// );
// router.post(
//   "/:id/image",
//   auth,
//   upload.single("image"),
//   filosofiController.addImage
// );

// DELETE food
router.delete("/:id", auth, filosofiController.deletePhilosophy);

// router.post(
//   "/category",
//   auth,
//   upload.single("image"),
//   filosofiController.createCategory
// );

module.exports = router;
