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

router.post("/api/notifications/resolve-batch", auth, async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "No notifications selected." });
  const cleanIds = ids.filter((id) => /^\d+$/.test(String(id))).map(Number);
  if (!cleanIds.length) return res.status(400).json({ error: "Invalid notification IDs." });
  try {
    const admin = req.session.user.role === "admin";
    if (admin) {
      await pool.query("UPDATE notifications SET status='resolved' WHERE notification_id IN (?)", [cleanIds]);
    } else {
      await pool.query(
        "UPDATE notifications n SET n.status='resolved' WHERE n.notification_id IN (?) AND EXISTS (SELECT 1 FROM generator_users gu WHERE gu.generator_id=n.generator_id AND gu.user_id=?)",
        [cleanIds, req.session.user.id],
      );
    }
    res.json({ success: true, count: cleanIds.length });
  } catch (error) {
    console.error("Batch resolve failed", { code: error.code });
    res.status(500).json({ error: "Failed to resolve selected notifications." });
  }
});

router.delete("/api/notifications/:id", auth, async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "Invalid notification ID." });
  try {
    const admin = req.session.user.role === "admin";
    const [result] = await pool.query(
      admin
        ? "DELETE FROM notifications WHERE notification_id=?"
        : "DELETE n FROM notifications n JOIN generator_users gu ON gu.generator_id=n.generator_id WHERE n.notification_id=? AND gu.user_id=?",
      admin ? [req.params.id] : [req.params.id, req.session.user.id],
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Notification not found or access denied." });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete notification failed", { code: error.code });
    res.status(500).json({ error: "Failed to delete notification." });
  }
});

router.post("/api/notifications/clear-resolved", auth, async (req, res) => {
  try {
    const admin = req.session.user.role === "admin";
    let result;
    if (admin) {
      [result] = await pool.query("DELETE FROM notifications WHERE status = 'resolved'");
    } else {
      [result] = await pool.query(
        "DELETE n FROM notifications n JOIN generator_users gu ON gu.generator_id=n.generator_id WHERE n.status = 'resolved' AND gu.user_id = ?",
        [req.session.user.id],
      );
    }
    res.json({ success: true, deleted: result.affectedRows });
  } catch (error) {
    console.error("Clear resolved failed", { code: error.code });
    res.status(500).json({ error: "Failed to clear resolved notifications." });
  }
});

router.post("/api/notifications", auth, async (req, res) => {
  const { generator_id, title, detail, severity } = req.body || {};
  if (!generator_id || !title || !detail) {
    return res.status(400).json({ error: "Generator, title, and detail are required." });
  }
  try {
    const admin = req.session.user.role === "admin";
    if (!admin) {
      const [allowed] = await pool.query(
        "SELECT 1 FROM generator_users WHERE generator_id=? AND user_id=?",
        [generator_id, req.session.user.id],
      );
      if (!allowed.length) {
        return res.status(403).json({ error: "Not authorized for this generator." });
      }
    }
    let finalDetail = String(detail).trim();
    if (severity === "critical" && !/\bcritical\b/i.test(finalDetail)) {
      finalDetail += " (critical)";
    } else if (severity === "warning" && !/\bwarning\b/i.test(finalDetail)) {
      finalDetail += " (warning)";
    }
    const [result] = await pool.query(
      "INSERT INTO notifications (generator_id, title, detail, status) VALUES (?, ?, ?, 'active')",
      [generator_id, String(title).trim().slice(0, 120), finalDetail.slice(0, 255)],
    );
    res.json({ success: true, notification_id: result.insertId });
  } catch (error) {
    console.error("Create notification failed", { code: error.code });
    res.status(500).json({ error: "Failed to create notification." });
  }
});

router.get("/api/notifications", auth, async (req, res) => {
  try {
    const rawLimit = Number(req.query.limit) || 200;
    const limit = Math.min(Math.max(rawLimit, 10), 1000);
    let query =
      "SELECT n.notification_id, n.generator_id, n.title, n.detail, n.status, n.created_at, g.name AS generator_name, g.location AS generator_location, g.serial_no FROM notifications n JOIN generators g ON g.generator_id=n.generator_id ORDER BY n.created_at DESC LIMIT ?";
    let params = [limit];
    if (req.session.user.role !== "admin") {
      query =
        "SELECT n.notification_id, n.generator_id, n.title, n.detail, n.status, n.created_at, g.name AS generator_name, g.location AS generator_location, g.serial_no FROM notifications n JOIN generators g ON g.generator_id=n.generator_id JOIN generator_users gu ON g.generator_id=gu.generator_id WHERE gu.user_id=? ORDER BY n.created_at DESC LIMIT ?";
      params = [req.session.user.id, limit];
    }
    const [rows] = await pool.query(query, params);
    res.json({ rows });
  } catch (error) {
    console.error("Fetch notifications failed", { code: error.code });
    res.status(503).json({ error: "Notifications unavailable." });
  }
});

router.post("/api/notifications/resolve-all", auth, async (req, res) => {
  try {
    if (req.session.user.role === "admin") {
      await pool.query("UPDATE notifications SET status = 'resolved' WHERE status = 'active'");
    } else {
      await pool.query(
        "UPDATE notifications n JOIN generator_users gu ON n.generator_id = gu.generator_id SET n.status = 'resolved' WHERE n.status = 'active' AND gu.user_id = ?",
        [req.session.user.id],
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Resolve all failed", { code: error.code });
    res.status(500).json({ error: "Failed to resolve notifications." });
  }
});

export default router;

