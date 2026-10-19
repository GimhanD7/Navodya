import express from "express";
import { pool } from "../lib/db.js";
import { auth } from "../lib/auth.js";

const router = express.Router();

router.post("/api/notifications/:id/resolve", auth, async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "Invalid notification." });
  try {
    const admin = req.session.user.role === "admin";
    const [result] = await pool.query(
      admin
        ? "UPDATE notifications SET status='resolved' WHERE notification_id=?"
        : "UPDATE notifications n SET n.status='resolved' WHERE n.notification_id=? AND EXISTS (SELECT 1 FROM generator_users gu WHERE gu.generator_id=n.generator_id AND gu.user_id=?)",
      admin ? [req.params.id] : [req.params.id, req.session.user.id],
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Notification not found or not assigned to you." });
    res.json({ success: true });
  } catch (error) {
    console.error("Resolve notification failed", { code: error.code });
    res.status(503).json({ error: "Unable to resolve notification. Please try again." });
  }
});

router.get("/api/notifications", auth, async (req, res) => {
  try {
    let query = "SELECT n.notification_id,n.title,n.detail,n.status,n.created_at,g.name AS generator_name FROM notifications n JOIN generators g ON g.generator_id=n.generator_id ORDER BY n.created_at DESC LIMIT 100";
    let params = [];
    if (req.session.user.role !== "admin") {
      query = "SELECT n.notification_id,n.title,n.detail,n.status,n.created_at,g.name AS generator_name FROM notifications n JOIN generators g ON g.generator_id=n.generator_id JOIN generator_users gu ON g.generator_id=gu.generator_id WHERE gu.user_id=? ORDER BY n.created_at DESC LIMIT 100";
      params = [req.session.user.id];
    }
    const [rows] = await pool.query(query, params);
    res.json({ rows });
  } catch (e) {
    res.status(503).json({ error: "Notifications unavailable." });
  }
});

router.post("/api/notifications/resolve-all", auth, async (req, res) => {
  try {
    if (req.session.user.role === "admin") {
      await pool.query("UPDATE notifications SET status = 'resolved' WHERE status = 'active'");
    } else {
      await pool.query("UPDATE notifications n JOIN generator_users gu ON n.generator_id = gu.generator_id SET n.status = 'resolved' WHERE n.status = 'active' AND gu.user_id = ?", [req.session.user.id]);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to resolve notifications." });
  }
});

export default router;
