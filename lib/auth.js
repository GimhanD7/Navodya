import crypto from "node:crypto";

const sessionSecret =
  "navodya-session-7f2d4c9a1b6e8d3f0c5a9e2b7d4f6a8c1e3b5d7f9a2c4e6b8d0f1a3c5e7b9";

export const signSession = (value) =>
  crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");

export const readSession = (req) => {
  const raw = req.headers.cookie?.match(
    /(?:^|;\s*)navodya_session=([^;]+)/,
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
