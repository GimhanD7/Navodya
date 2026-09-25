import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
const c = await mysql.createConnection({
  host: "141.148.197.200",
  port: 3307,
  user: "project",
  password: "Dulina123",
  database: "generator_monitoring",
});
await c.query(
  `CREATE TABLE IF NOT EXISTS generator_users (generator_id INT NOT NULL, user_id INT NOT NULL, PRIMARY KEY(generator_id,user_id), FOREIGN KEY(generator_id) REFERENCES generators(generator_id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE)`,
);
await c.query(
  `CREATE TABLE IF NOT EXISTS generator_readings (reading_id BIGINT AUTO_INCREMENT PRIMARY KEY, generator_id INT NOT NULL, status ENUM('running','stopped','fault','maintenance') NOT NULL DEFAULT 'running', voltage DECIMAL(8,2), current DECIMAL(8,2), frequency DECIMAL(8,2), temperature DECIMAL(8,2), fuel_level DECIMAL(6,2), runtime_seconds BIGINT, recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, source VARCHAR(40) NOT NULL DEFAULT 'seed-demo', INDEX(generator_id,recorded_at), FOREIGN KEY(generator_id) REFERENCES generators(generator_id) ON DELETE CASCADE)`,
);
await c.query(
  `CREATE TABLE IF NOT EXISTS notifications (notification_id BIGINT AUTO_INCREMENT PRIMARY KEY, generator_id INT NOT NULL, title VARCHAR(120) NOT NULL, detail VARCHAR(255) NOT NULL, status ENUM('active','resolved') NOT NULL DEFAULT 'active', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(generator_id) REFERENCES generators(generator_id) ON DELETE CASCADE)`,
);
const hash = await bcrypt.hash("12345678", 12);
await c.query(
  `INSERT INTO users (name,email,password_hash,role) VALUES ('Kamal','kamal@example.com',?,'operator'),('Nimal','nimal@example.com',?,'viewer') ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role)`,
  [hash, hash],
);
const users = await c.query(
  'SELECT user_id,email FROM users WHERE email IN ("kamal@example.com","nimal@example.com")',
);
await c.query(
  `INSERT INTO generators (serial_no,name,location,rated_capacity_kva,install_date) VALUES ('GEN-001','Generator 01','Server Room',250,'2024-01-15'),('GEN-002','Generator 02','Workshop',180,'2024-03-20') ON DUPLICATE KEY UPDATE name=VALUES(name),location=VALUES(location)`,
);
const [gens] = await c.query(
  'SELECT generator_id,serial_no FROM generators WHERE serial_no IN ("GEN-001","GEN-002")',
);
const kam = users[0].find((x) => x.email === "kamal@example.com")?.user_id,
  nim = users[0].find((x) => x.email === "nimal@example.com")?.user_id;
for (const g of gens) {
  const uid = g.serial_no === "GEN-001" ? kam : nim;
  if (uid)
    await c.query(
      "INSERT IGNORE INTO generator_users (generator_id,user_id) VALUES (?,?)",
      [g.generator_id, uid],
    );
}
for (const g of gens) {
  const values =
    g.serial_no === "GEN-001"
      ? ["running", 231.5, 12.3, 50.1, 78.4, 68, 154200]
      : ["running", 229.8, 10.8, 49.9, 82.1, 41, 98700];
  await c.query(
    "INSERT INTO generator_readings (generator_id,status,voltage,current,frequency,temperature,fuel_level,runtime_seconds,source) VALUES (?,?,?,?,?,?,?,?,?)",
    [g.generator_id, ...values, "seed-demo"],
  );
}
await c.query(
  "INSERT INTO notifications (generator_id,title,detail,status) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE title=? )",
  [
    gens[0].generator_id,
    "Maintenance reminder",
    "Oil service due in 7 hours",
    "active",
    "Maintenance reminder",
  ],
);
const configs = [
  ["temperature", 85, null, null, 95],
  ["voltage", 210, 250, 190, 260],
  ["frequency", 49, 51, 47, 53],
  ["fuel", 20, null, 10, null],
];
for (const x of configs)
  await c.query(
    "INSERT INTO maintenance_config (parameter,warning_min,warning_max,critical_min,critical_max,enabled) VALUES (?,?,?,?,?,1) ON DUPLICATE KEY UPDATE warning_min=VALUES(warning_min),warning_max=VALUES(warning_max),critical_min=VALUES(critical_min),critical_max=VALUES(critical_max),enabled=1",
    x,
  );
console.log(
  JSON.stringify({
    generators: gens,
    users: users[0].map((x) => x.email),
    readings: "seeded",
  }),
);
await c.end();
