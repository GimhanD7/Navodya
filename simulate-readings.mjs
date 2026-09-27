import mysql from "mysql2/promise";
const c = await mysql.createConnection({
  host: process.env.MYSQL_HOST || "141.148.197.200",
  port: Number(process.env.MYSQL_PORT || 3307),
  user: process.env.MYSQL_USER || "project",
  password: process.env.MYSQL_PASSWORD || "Dulina123",
  database: process.env.MYSQL_DATABASE || "generator_monitoring",
});
const [gens] = await c.query(
  "SELECT generator_id FROM generators ORDER BY generator_id",
);
let tick = 0;
const limit = Number(process.env.SIM_SECONDS || 60);
console.log(`Writing test readings every second for ${limit} seconds.`);
const timer = setInterval(async () => {
  tick++;
  
  // Fetch current config
  const [cfg] = await c.query("SELECT parameter,warning_min,warning_max,critical_min,critical_max FROM maintenance_config WHERE enabled=1");
  const limits = { temperatureWarning: 85, fuelWarning: 20 }; // Defaults
  for (const x of cfg) {
    if (x.parameter === "temperature") limits.temperatureWarning = Number(x.warning_max);
    if (x.parameter === "fuel") limits.fuelWarning = Number(x.warning_min);
  }

  for (const [i, g] of gens.entries()) {
    const temperature = 88.4 + Math.sin(tick / 8 + i) * 2; 
    const fuel = Math.max(0, 68 - tick / 180 - i * 25);
    const g_id = g.generator_id;
    await c.query(
      "INSERT INTO generator_readings (generator_id,status,voltage,current,frequency,temperature,fuel_level,runtime_seconds,source) VALUES (?,?,?,?,?,?,?,?,?)",
      [g_id, "running", 231.5 + Math.sin(tick / 5 + i), 12.3 + Math.sin(tick / 6 + i), 50.1 + Math.sin(tick / 7 + i) * 0.1, temperature, fuel, 154200 + tick, "test-simulator"]
    );
    
    // Check against live DB limits
    if (temperature >= limits.temperatureWarning) {
      const [existing] = await c.query("SELECT 1 FROM notifications WHERE generator_id = ? AND title = 'High temperature' AND status = 'active' LIMIT 1", [g_id]);
      if (existing.length === 0) {
        await c.query("INSERT INTO notifications (generator_id,title,detail,status) VALUES (?,?,?,?)", [g_id, "High temperature", `Temperature: ${temperature.toFixed(1)} (warning)`, "active"]);
      }
    }
    if (fuel <= limits.fuelWarning) {
      const [existing] = await c.query("SELECT 1 FROM notifications WHERE generator_id = ? AND title = 'Low fuel' AND status = 'active' LIMIT 1", [g_id]);
      if (existing.length === 0) {
        await c.query("INSERT INTO notifications (generator_id,title,detail,status) VALUES (?,?,?,?)", [g_id, "Low fuel", `Fuel: ${fuel.toFixed(1)} (warning)`, "active"]);
      }
    }
  }
  console.log(new Date().toISOString(), "readings written");
  if (tick >= limit) {
    clearInterval(timer);
    await c.end();
  }
}, 1000);
