import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSession } from "./lib/auth.js";
import apiRoutes from "./routes/api.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  req.session = { user: readSession(req) };
  next();
});
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === "GET",
  }),
);

app.use(apiRoutes);

app.get("/favicon.ico", (req, res) => res.status(204).end());
app.use(express.static(path.join(root, "public")));
app.use((req, res) => res.sendFile(path.join(root, "public/index.html")));
app.listen(port, () =>
  console.log(`Generator System listening on http://localhost:${port}`),
);
