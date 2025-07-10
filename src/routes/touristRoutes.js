const express = require("express");
const router = express.Router();
const touristController = require("../controllers/touristControllers");
const upload = require("../middleware/upload"); // import middleware upload
const { auth } = require("../middleware/authMiddleware");

// GET all tourist
router.get("/",touristController.getAll);
router.get("/categories", touristController.getCategories);

// GET tourist by id
router.get("/:id", touristController.getById);

// CREATE new tourist (with single image upload)
router.post("/", auth, upload.single("image"), touristController.create);

// UPDATE tourist data
router.put("/:id", auth, upload.single("image"), touristController.updatetourist);

router.put(
  "/:id/image/:imageId",
  auth,
  upload.single("image"),
  touristController.updateSingleImage
);

router.delete(
  "/:id/image/:imageId",
  auth,
  upload.single("image"),
  touristController.deleteSingleImage
);
router.post(
  "/:id/image",
  auth,
  upload.single("image"),
  touristController.addImage
);

// DELETE tourist
router.delete("/:id", auth, touristController.deletetourist);

router.post(
  "/category",
  auth,
  upload.single("image"),
  touristController.createCategory
);

module.exports = router;
