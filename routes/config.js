import express from "express";
import { pool } from "../lib/db.js";
import { auth } from "../lib/auth.js";
import { defaults } from "../lib/status.js";

const router = express.Router();

router.get("/api/config", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT parameter,warning_min,warning_max,critical_min,critical_max,enabled FROM maintenance_config WHERE enabled=1",
    );
    res.json({ rows, defaults });
  } catch (e) {
    res.status(503).json({ error: "Configuration unavailable." });
  }
});
router.put("/api/config", auth, async (req, res) => {
  if (req.session.user.role !== "admin")
    return res
      .status(403)
      .json({ error: "Only administrators can change thresholds." });
  try {
    const { parameter, warning_min, warning_max, critical_min, critical_max } =
      req.body;
    if (!["temperature", "voltage", "frequency", "fuel"].includes(parameter))
      return res.status(400).json({ error: "Invalid parameter." });
    await pool.query(
      "UPDATE maintenance_config SET warning_min=?,warning_max=?,critical_min=?,critical_max=?,enabled=1,updated_at=NOW() WHERE parameter=?",
      [
        warning_min || null,
        warning_max || null,
        critical_min || null,
        critical_max || null,
        parameter,
      ],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(503).json({ error: "Unable to save configuration." });
  }
});

export default router;
