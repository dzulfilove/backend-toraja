const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/db");
const axios = require("axios");
// Register user
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [
      username,
      hashed,
    ]);
    res.json({ message: "User registered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(req.body);

    const [rows] = await db.query("SELECT * FROM users WHERE username=?", [
      username,
    ]);
    if (rows.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    // Buat token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { username } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE username=?", [
      username,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = rows[0];

    const resetToken = jwt.sign({ id: user.username }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    // Kirim ke Telegram
    const telegramMessage = `Hai, Your reset token: ${resetToken}`;
    await axios.post(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
      {
        chat_id: "6546310886",
        text: telegramMessage,
      }
    );

    res.json({ message: "Reset token sent to your Telegram" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
// route reset password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  console.log(req.body);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password=? WHERE username=?", [
      hashed,
      decoded.id,
    ]);
    console.log("Received token:", hashed);
    console.log("JWT_SECRET:", decoded.id);

    res.json({ message: "Password updated" });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: "Invalid or expired token" });
  }
});

module.exports = router;
