import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
const c=await mysql.createConnection({host:'141.148.197.200',port:3307,user:'project',password:'Dulina123',database:'generator_monitoring'});
const hash=await bcrypt.hash('12345678',12);
await c.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role=VALUES(role)', ['gimhana','gimhandeshapriya567@gmail.com',hash,'admin']);
const [rows]=await c.query('SELECT user_id,name,email,role FROM users WHERE email=?',['gimhandeshapriya567@gmail.com']); console.log(JSON.stringify(rows)); await c.end();
