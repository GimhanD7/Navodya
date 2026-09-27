import mysql from "mysql2/promise";

async function addSourceColumn() {
  const c = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "141.148.197.200",
    port: Number(process.env.MYSQL_PORT || 3307),
    user: process.env.MYSQL_USER || "project",
    password: process.env.MYSQL_PASSWORD || "Dulina123",
    database: process.env.MYSQL_DATABASE || "generator_monitoring",
  });
  
  console.log("Adding source column to generator_readings...");
  try {
    await c.query("ALTER TABLE generator_readings ADD COLUMN source VARCHAR(50) DEFAULT NULL");
    console.log("Column added successfully.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists.");
    } else {
      console.error("Error adding column:", err);
    }
  }
  
  await c.end();
}

addSourceColumn();
