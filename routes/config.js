import express from "express";
import { pool } from "../lib/db.js";
import { auth } from "../lib/auth.js";
import { defaults } from "../lib/status.js";
import { parseThresholds } from "../lib/configuration.js";

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
  let configuration;
  try { configuration = parseThresholds(req.body || {}); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    const { parameter, warning_min, warning_max, critical_min, critical_max } = configuration;
    const [result] = await pool.query(
      "UPDATE maintenance_config SET warning_min=?,warning_max=?,critical_min=?,critical_max=?,enabled=1,updated_at=NOW() WHERE parameter=?",
      [
        warning_min,
        warning_max,
        critical_min,
        critical_max,
        parameter,
      ],
    );
    if (!result.affectedRows) return res.status(404).json({ error: "This configuration entry does not exist. No thresholds were saved." });
    res.json({ ok: true, configuration });
  } catch (e) {
    res.status(503).json({ error: "Unable to save configuration." });
  }
});

export default router;
