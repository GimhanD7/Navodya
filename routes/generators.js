import express from "express";
import { pool } from "../lib/db.js";
import { auth } from "../lib/auth.js";
import { defaults, parameterStatus } from "../lib/status.js";

const router = express.Router();

router.get("/api/generators", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT generator_id,name,serial_no,location,rated_capacity_kva,install_date FROM generators ORDER BY name",
    );
    res.json({ rows, telemetryAvailable: false });
  } catch (e) {
    res.status(503).json({ error: "Generators unavailable." });
  }
});
router.get("/api/generators/:id/latest", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT status,voltage,current,frequency,temperature,fuel_level,runtime_seconds,source,recorded_at FROM generator_readings WHERE generator_id=? ORDER BY recorded_at DESC LIMIT 1",
      [req.params.id],
    );
    res.json({ reading: rows[0] || null });
  } catch (e) {
    res.status(503).json({ error: "Telemetry unavailable." });
  }
});
router.post("/api/generators", auth, async (req, res) => {
  if (req.session.user.role !== "admin")
    return res
      .status(403)
      .json({ error: "Only administrators can add generators." });
  try {
    const { name, serial_no, location, rated_capacity_kva, install_date } =
      req.body;
    if (!name || !serial_no)
      return res
        .status(400)
        .json({ error: "Name and serial number are required." });
    const [r] = await pool.query(
      "INSERT INTO generators (name,serial_no,location,rated_capacity_kva,install_date) VALUES (?,?,?,?,?)",
      [
        name,
        serial_no,
        location || null,
        rated_capacity_kva || null,
        install_date || null,
      ],
    );
    res.status(201).json({ generator_id: r.insertId });
  } catch (e) {
    res.status(e.code === "ER_DUP_ENTRY" ? 409 : 503).json({
      error:
        e.code === "ER_DUP_ENTRY"
          ? "Serial number already exists."
          : "Unable to add generator.",
    });
  }
});
router.post("/api/generators/:id/readings", auth, async (req, res) => {
  try {
    const b = req.body;
    const fields = [
      "status",
      "voltage",
      "current",
      "frequency",
      "temperature",
      "fuel_level",
      "runtime_seconds",
    ];
    if (!fields.every((k) => b[k] !== undefined))
      return res
        .status(400)
        .json({ error: "All reading fields are required." });
    await pool.query(
      "INSERT INTO generator_readings (generator_id,status,voltage,current,frequency,temperature,fuel_level,runtime_seconds) VALUES (?,?,?,?,?,?,?,?)",
      [
        req.params.id,
        b.status,
        b.voltage,
        b.current,
        b.frequency,
        b.temperature,
        b.fuel_level,
        b.runtime_seconds,
      ],
    );
    const [cfg] = await pool.query(
      "SELECT parameter,warning_min,warning_max,critical_min,critical_max FROM maintenance_config WHERE enabled=1",
    );
    const limits = { ...defaults };
    for (const x of cfg) {
      if (x.parameter === "temperature") {
        limits.temperatureWarning = Number(x.warning_max);
        limits.temperatureCritical = Number(x.critical_max);
      }
      if (x.parameter === "fuel") {
        limits.fuelWarning = Number(x.warning_min);
        limits.fuelCritical = Number(x.critical_min);
      }
      if (x.parameter === "voltage") {
        limits.voltageWarningMin = Number(x.warning_min);
        limits.voltageWarningMax = Number(x.warning_max);
        limits.voltageCriticalMin = Number(x.critical_min);
        limits.voltageCriticalMax = Number(x.critical_max);
      }
      if (x.parameter === "frequency") {
        limits.frequencyWarningMin = Number(x.warning_min);
        limits.frequencyWarningMax = Number(x.warning_max);
        limits.frequencyCriticalMin = Number(x.critical_min);
        limits.frequencyCriticalMax = Number(x.critical_max);
      }
    }
    const checks = [
      ["High temperature", "temperature", b.temperature, "Temperature"],
      ["Voltage out of range", "voltage", b.voltage, "Voltage"],
      ["Frequency out of range", "frequency", b.frequency, "Frequency"],
      ["Low fuel", "fuel", b.fuel_level, "Fuel"],
    ];
    for (const [title, key, value, label] of checks) {
      const status = parameterStatus(key, value, limits);
      if (status === "warning" || status === "critical")
        await pool.query(
          "INSERT INTO notifications (generator_id,title,detail,status) VALUES (?,?,?,?)",
          [req.params.id, title, `${label}: ${value} (${status})`, "active"],
        );
    }
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(503).json({ error: "Unable to save reading." });
  }
});

export default router;
