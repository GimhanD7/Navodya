import mysql from 'mysql2/promise';
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdout.write('Ready for database credentials on stdin (input hidden).\n');
let input = '';
process.stdin.on('data', async chunk => {
  input += chunk.toString();
  if (!input.trim().endsWith('}')) return;
  process.stdin.pause();
  let connection;
  try {
    const credentials = JSON.parse(input.trim());
    connection = await mysql.createConnection({ ...credentials, connectTimeout: 10000 });
    const [databases] = await connection.query('SHOW DATABASES');
    const output = [];
    for (const { Database: name } of databases) {
      if (['information_schema', 'performance_schema', 'mysql', 'sys'].includes(name)) continue;
      const [tables] = await connection.query('SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION', [name]);
      output.push({ database: name, columns: tables });
    }
    console.log(JSON.stringify(output, null, 2));
  } catch (error) { console.error(error.code || 'Connection failed'); process.exitCode = 1; }
  finally { if (connection) await connection.end(); process.exit(process.exitCode || 0); }
});
