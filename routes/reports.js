import express from "express";
import { pool } from "../lib/db.js";
import { auth } from "../lib/auth.js";
import { databaseError } from "../lib/database-error.js";

const router = express.Router();

router.get("/api/generators/:id/history", auth, async (req, res) => {
  if (req.session.user.role !== "admin")
    return res.status(403).json({ error: "Only administrators can view historical reports." });

  try {
    const limit = parseInt(req.query.limit) || 1000;
    const [rows] = await pool.query(
      "SELECT status,voltage,current,frequency,temperature,fuel_level,runtime_seconds,recorded_at,source FROM generator_readings WHERE generator_id=? ORDER BY recorded_at DESC LIMIT ?",
      [req.params.id, limit]
    );
    res.json({ rows });
  } catch (e) {
    res.status(503).json(databaseError(e));
  }
});

export default router;
