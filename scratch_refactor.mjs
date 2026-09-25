import fs from 'fs';

const serverCode = fs.readFileSync('server.js', 'utf8');

const dbCode = `import mysql from "mysql2/promise";

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
`;
fs.writeFileSync('lib/db.js', dbCode);

const authCode = `import crypto from "node:crypto";

const sessionSecret = "navodya-session-7f2d4c9a1b6e8d3f0c5a9e2b7d4f6a8c1e3b5d7f9a2c4e6b8d0f1a3c5e7b9";

export const signSession = (value) =>
  crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");

export const readSession = (req) => {
  const raw = req.headers.cookie?.match(
    /(?:^|;\\s*)navodya_session=([^;]+)/,
  )?.[1];
  if (!raw) return null;
  const [payload, signature] = decodeURIComponent(raw).split(".");
  if (!payload || !signature) return null;
  const expected = signSession(payload);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
};

export const auth = (req, res, next) =>
  req.session.user
    ? next()
    : res.status(401).json({ error: "Authentication required" });
`;
fs.writeFileSync('lib/auth.js', authCode);

// Robustly extract the API routes
const match = serverCode.match(/app\.post\("\/api\/login"[\s\S]*?app\.delete\("\/api\/users\/:id"[\s\S]*?\}\);/);
const apiCodeLines = match ? match[0] : '';
const updatedApiCodeLines = apiCodeLines.replace(/app\.(get|post|put|delete)\(/g, 'router.$1(');

const apiCode = `import express from "express";
import bcrypt from "bcryptjs";
import { pool } from "../lib/db.js";
import { signSession, auth } from "../lib/auth.js";
import { defaults, parameterStatus } from "../lib/status.js";

const router = express.Router();

${updatedApiCodeLines}

export default router;
`;
fs.mkdirSync('routes', { recursive: true });
fs.writeFileSync('routes/api.js', apiCode);

const newServerLines = [
  'import express from "express";',
  'import helmet from "helmet";',
  'import rateLimit from "express-rate-limit";',
  'import path from "node:path";',
  'import { fileURLToPath } from "node:url";',
  'import { readSession } from "./lib/auth.js";',
  'import apiRoutes from "./routes/api.js";',
  '',
  'const root = path.dirname(fileURLToPath(import.meta.url));',
  'const app = express();',
  'const port = 3000;',
  '',
  'app.use(helmet({ contentSecurityPolicy: false }));',
  'app.use(express.json());',
  'app.use(express.urlencoded({ extended: false }));',
  'app.use((req, res, next) => {',
  '  req.session = { user: readSession(req) };',
  '  next();',
  '});',
  'app.use(',
  '  rateLimit({',
  '    windowMs: 15 * 60 * 1000,',
  '    limit: 120,',
  '    standardHeaders: true,',
  '    legacyHeaders: false,',
  '    skip: (req) => req.method === "GET",',
  '  }),',
  ');',
  '',
  'app.use(apiRoutes);',
  '',
  'app.get("/favicon.ico", (req, res) => res.status(204).end());',
  'app.use(express.static(path.join(root, "public")));',
  'app.use((req, res) => res.sendFile(path.join(root, "public/index.html")));',
  'app.listen(port, () =>',
  '  console.log(\`Generator System listening on http://localhost:\${port}\`),',
  ');',
];
fs.writeFileSync('server.js', newServerLines.join('\n'));
