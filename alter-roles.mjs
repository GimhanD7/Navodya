import mysql from 'mysql2/promise';
const c=await mysql.createConnection({host:'141.148.197.200',port:3307,user:'project',password:'Dulina123',database:'generator_monitoring'});
await c.query("ALTER TABLE users MODIFY role ENUM('admin','operator','viewer') NOT NULL DEFAULT 'viewer'"); console.log('roles updated'); await c.end();
