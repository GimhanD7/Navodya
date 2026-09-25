import mysql from "mysql2/promise";

// Database connection for the deployed monitoring database.
const databaseConfig = {
  host: "141.148.197.200",
  port: 3307,
  user: "project",
  password: "Dulina123",
  database: "generator_monitoring",
  waitForConnections: true,
  connectionLimit: 5,
  connectTimeout: 10000,
};
export const pool = mysql.createPool(databaseConfig);
