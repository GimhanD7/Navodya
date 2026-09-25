import mysql from "mysql2/promise";
const db = await mysql.createConnection({
  host: "141.148.197.200",
  port: 3307,
  user: "project",
  password: "Dulina123",
  database: "generator_monitoring",
});
const [rows] = await db.query(
  "SELECT user_id,name,email,role,created_at FROM users ORDER BY user_id",
);
console.log(JSON.stringify(rows, null, 2));
await db.end();
