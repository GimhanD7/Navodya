import express from "express";
import { pool } from "../lib/db.js";
import bcrypt from "bcryptjs";
import { auth } from "../lib/auth.js";

const router = express.Router();

router.get("/api/users", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT user_id,name,email,role,created_at FROM users ORDER BY name",
    );
    res.json({ rows });
  } catch (e) {
    res.status(503).json({ error: "Users unavailable." });
  }
});
router.post("/api/users", auth, async (req, res) => {
  if (req.session.user.role !== "admin")
    return res
      .status(403)
      .json({ error: "Only administrators can create users." });
  try {
    const name = String(req.body.name || "").trim(),
      email = String(req.body.email || "")
        .trim()
        .toLowerCase(),
      password = String(req.body.password || ""),
      role = String(req.body.role || "viewer");
    if (
      !name ||
      !email ||
      password.length < 8 ||
      !["admin", "operator", "viewer"].includes(role)
    )
      return res.status(400).json({
        error:
          "Name, email, valid role, and a password of at least 8 characters are required.",
      });
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      "INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)",
      [name, email, hash, role],
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(e.code === "ER_DUP_ENTRY" ? 409 : 503).json({
      error:
        e.code === "ER_DUP_ENTRY"
          ? "That email is already in use."
          : "Unable to create user.",
    });
  }
});
router.put("/api/users/:id", auth, async (req, res) => {
  if (req.session.user.role !== "admin")
    return res
      .status(403)
      .json({ error: "Only administrators can edit users." });
  try {
    const name = String(req.body.name || "").trim(),
      email = String(req.body.email || "")
        .trim()
        .toLowerCase(),
      role = String(req.body.role || "viewer");
    if (!name || !email || !["admin", "operator", "viewer"].includes(role))
      return res
        .status(400)
        .json({ error: "Name, email, and a valid role are required." });
    await pool.query("UPDATE users SET name=?,email=?,role=? WHERE user_id=?", [
      name,
      email,
      role,
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(e.code === "ER_DUP_ENTRY" ? 409 : 503).json({
      error:
        e.code === "ER_DUP_ENTRY"
          ? "That email is already in use."
          : "Unable to update user.",
    });
  }
});
router.delete("/api/users/:id", auth, async (req, res) => {
  if (req.session.user.role !== "admin")
    return res
      .status(403)
      .json({ error: "Only administrators can delete users." });
  if (String(req.session.user.id) === String(req.params.id))
    return res
      .status(400)
      .json({ error: "You cannot delete your own account." });
  try {
    await pool.query("DELETE FROM users WHERE user_id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(503).json({ error: "Unable to delete user." });
  }
});

export default router;
