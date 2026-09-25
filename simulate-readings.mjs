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
  for (const [i, g] of gens.entries()) {
    const temperature = 78.4 + Math.sin(tick / 8 + i) * 2;
    const fuel = Math.max(0, 68 - tick / 180 - i * 25);
    await c.query(
      "INSERT INTO generator_readings (generator_id,status,voltage,current,frequency,temperature,fuel_level,runtime_seconds,source) VALUES (?,?,?,?,?,?,?,?,?)",
      [
        g.generator_id,
        "running",
        231.5 + Math.sin(tick / 5 + i),
        12.3 + Math.sin(tick / 6 + i),
        50.1 + Math.sin(tick / 7 + i) * 0.1,
        temperature,
        fuel,
        154200 + tick,
        "test-simulator",
      ],
    );
  }
  console.log(new Date().toISOString(), "readings written");
  if (tick >= limit) {
    clearInterval(timer);
    await c.end();
  }
}, 1000);
