import express from "express";
import { pool } from "../lib/db.js";
import bcrypt from "bcryptjs";
import { signSession } from "../lib/auth.js";

const router = express.Router();

router.post("/api/login", async (req, res) => {
  try {
    const identifier = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    if (!identifier || !password)
      return res.status(400).json({ error: "Enter username and password." });
    const [rows] = await pool.query(
      "SELECT user_id,name,email,password_hash,role FROM users WHERE email=? OR name=? LIMIT 1",
      [identifier, identifier],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: "Invalid username or password." });
    const sessionUser = {
      id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    const payload = Buffer.from(JSON.stringify(sessionUser)).toString(
      "base64url",
    );
    res.setHeader(
      "Set-Cookie",
      `navodya_session=${payload}.${signSession(payload)}; Max-Age=28800; Path=/; HttpOnly; SameSite=Lax; Secure`,
    );
    res.json({ user: sessionUser });
  } catch (e) {
    console.error("Login failed", {
      code: e.code || "UNKNOWN",
      errno: e.errno,
      sqlState: e.sqlState,
    });
    res
      .status(503)
      .json({ error: "Database unavailable. Check the server connection." });
  }
});
router.post("/api/logout", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "navodya_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure",
  );
  res.json({ ok: true });
});
router.get("/api/session", (req, res) =>
  res.json({ user: req.session.user || null }),
);

export default router;
