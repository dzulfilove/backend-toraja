const express = require("express");
const router = express.Router();
const controller = require("../controllers/historyControllers");
const upload = require("../middleware/upload"); // import middleware upload
const { auth } = require("../middleware/authMiddleware");

router.get("/", auth, controller.getAll);

// route spesifik dulu
router.put("/image/:id", upload.single("image"), controller.updateImage);
router.get("/:id/images", auth, controller.getImage);

// route umum
router.get("/:id", auth, controller.getById);
router.put("/:id", auth, controller.update);
router.delete("/:id", auth, controller.delete);
router.post("/", auth, controller.create);

module.exports = router;
