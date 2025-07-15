const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./config/db"); // import db pool
const functions = require("firebase-functions");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads"));

// ...
app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api/history", require("./routes/historyRoutes"));
app.use("/api/food", require("./routes/foodRoutes"));
app.use("/api/philosophy", require("./routes/philosophyRoutes"));
app.use("/api/dance", require("./routes/danceRoutes"));
app.use("/api/tourist", require("./routes/touristRoutes"));

// Naikkan limit body-parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PORT = process.env.APP_PORT || 5000;

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

exports.toraja = functions.https.onRequest(app);
