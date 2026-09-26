import express from "express";
import { pool } from "../lib/db.js";
import { auth } from "../lib/auth.js";

const router = express.Router();

router.get("/api/notifications", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT n.notification_id,n.title,n.detail,n.status,n.created_at,g.name AS generator_name FROM notifications n JOIN generators g ON g.generator_id=n.generator_id ORDER BY n.created_at DESC LIMIT 100",
    );
    res.json({ rows });
  } catch (e) {
    res.status(503).json({ error: "Notifications unavailable." });
  }
});

export default router;
