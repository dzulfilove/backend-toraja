const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./src/config/db"); // import db pool

const app = express();
app.use(cors());
app.use(express.json());

// Naikkan limit body-parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/uploads", express.static("uploads"));

// ...
app.use("/api/auth", require("./src/routes/authRoutes"));

app.use("/api/history", require("./src/routes/historyRoutes"));
app.use("/api/food", require("./src/routes/foodRoutes"));
app.use("/api/dance", require("./src/routes/danceRoutes"));

const PORT = process.env.PORT || 5000;

// ✅ Test config & db connection sebelum start server
async function startServer() {
  try {
    // Log config
    console.log("Loaded config:", {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      // jangan log password ya, demi keamanan
    });

    // Test query ke database
    await db.query("SELECT 1");
    console.log("✅ Database connected successfully");

    // Jalankan server
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
    process.exit(1); // stop aplikasi
  }
}

startServer();
