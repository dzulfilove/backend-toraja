const express = require("express");
const router = express.Router();
const danceController = require("../controllers/danceControllers");
const upload = require("../middleware/upload"); // import middleware upload
const { auth } = require("../middleware/authMiddleware");

// GET all dance
router.get("/",danceController.getAll);
router.get("/part",danceController.getAllPart);
router.get("/categories", danceController.getCategories);

// GET dance by id
router.get("/:id", danceController.getById);

// CREATE new dance (with single image upload)
router.post("/", auth, upload.single("image"), danceController.create);

// UPDATE dance data
router.put("/:id", auth, upload.single("image"), danceController.updatedance);

router.put(
  "/:id/image/:imageId",
  auth,
  upload.single("image"),
  danceController.updateSingleImage
);

router.delete(
  "/:id/image/:imageId",
  auth,
  upload.single("image"),
  danceController.deleteSingleImage
);
router.post(
  "/:id/image",
  auth,
  upload.single("image"),
  danceController.addImage
);

// DELETE dance
router.delete("/:id", auth, danceController.deletedance);

router.post(
  "/category",
  auth,
  upload.single("image"),
  danceController.createCategory
);

module.exports = router;
