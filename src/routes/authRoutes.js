const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/db");
const axios = require("axios");

// Register user
router.post("/register", async (req, res) => {
  try {
    console.log("[REGISTER] Request body:", req.body);
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const result = await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [
      username,
      hashed,
    ]);
    console.log("[REGISTER] Insert result:", result);
    res.json({ message: "User registered" });
  } catch (err) {
    console.error("[REGISTER] Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    console.log("[LOGIN] Request body:", req.body);
    const { username, password } = req.body;

    const [rows] = await db.query("SELECT * FROM users WHERE username=?", [
      username,
    ]);
    console.log("[LOGIN] DB rows:", rows);

    if (rows.length === 0) {
      console.warn("[LOGIN] Invalid credentials: user not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    console.log("[LOGIN] Password match:", match);

    if (!match) {
      console.warn("[LOGIN] Invalid credentials: password mismatch");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    console.log("[LOGIN] Generated token:", token);

    res.json({ token });
  } catch (err) {
    console.error("[LOGIN] Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Forgot password
router.post("/forgot-password", async (req, res) => {
  console.log("[FORGOT PASSWORD] Request body:", req.body);
  const { username } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE username=?", [
      username,
    ]);
    console.log("[FORGOT PASSWORD] DB rows:", rows);

    if (rows.length === 0) {
      console.warn("[FORGOT PASSWORD] User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    const resetToken = jwt.sign({ id: user.username }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });
    console.log("[FORGOT PASSWORD] Generated reset token:", resetToken);

    const telegramMessage = `Hai, Your reset token: ${resetToken}`;
    const telegramRes = await axios.post(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
      {
        chat_id: "6546310886",
        text: telegramMessage,
      }
    );
    console.log("[FORGOT PASSWORD] Telegram API response:", telegramRes.data);

    res.json({ message: "Reset token sent to your Telegram" });
  } catch (err) {
    console.error("[FORGOT PASSWORD] Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Reset password
router.post("/reset-password", async (req, res) => {
  console.log("[RESET PASSWORD] Request body:", req.body);
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("[RESET PASSWORD] Decoded token:", decoded);

    const hashed = await bcrypt.hash(newPassword, 10);
    console.log("[RESET PASSWORD] New hashed password:", hashed);

    const result = await db.query("UPDATE users SET password=? WHERE username=?", [
      hashed,
      decoded.id,
    ]);
    console.log("[RESET PASSWORD] Update result:", result);

    res.json({ message: "Password updated" });
  } catch (err) {
    console.error("[RESET PASSWORD] Error:", err);
    res.status(400).json({ message: "Invalid or expired token" });
  }
});

// Check login status
router.get(
  "/check",
  require("../middleware/authMiddleware").auth,
  async (req, res) => {
    try {
      console.log("[CHECK] req.user from middleware:", req.user);

      const [rows] = await db.query(
        "SELECT username FROM users WHERE username=?",
        [req.user.username]
      );
      console.log("[CHECK] DB rows:", rows);

      if (rows.length === 0) {
        console.warn("[CHECK] User not found in DB");
        return res.status(404).json({ message: "User not found" });
      }

      res.json(rows[0]);
    } catch (err) {
      console.error("[CHECK] Error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
