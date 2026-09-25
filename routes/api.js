import express from "express";
import bcrypt from "bcryptjs";
import { pool } from "../lib/db.js";
import { signSession, auth } from "../lib/auth.js";
import { defaults, parameterStatus } from "../lib/status.js";

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
      "SELECT status,voltage,current,frequency,temperature,fuel_level,runtime_seconds,recorded_at FROM generator_readings WHERE generator_id=? ORDER BY recorded_at DESC LIMIT 1",
      [req.params.id],
    );
    res.json({ reading: rows[0] || null });
  } catch (e) {
    res.status(503).json({ error: "Telemetry unavailable." });
  }
});
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
        limits.temperatureWarning = Number(x.warning_min);
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
