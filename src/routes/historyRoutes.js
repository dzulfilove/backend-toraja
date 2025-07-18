const express = require("express");
const router = express.Router();
const controller = require("../controllers/historyControllers");
const upload = require("../middleware/upload"); // import middleware upload
const { auth } = require("../middleware/authMiddleware");

router.get("/",controller.getAll);

// Pisah route
router.put("/:id", auth, controller.updateHistory);
// Update gambar (1 file per request)
router.put(
  "/:id/image/:imageId",
  auth,
  upload.single("image"),
  controller.updateSingleImage
);


router.delete(
  "/:id/image/:imageId",
  auth,
  upload.single("image"),
  controller.deleteSingleImage
);


// Tambah gambar baru (tanpa id)
router.post("/:id/image", auth, upload.single("image"), controller.addImage);
// route umum
router.get("/:id", controller.getById);
// router.post("/", auth, controller.create);


module.exports = router;
