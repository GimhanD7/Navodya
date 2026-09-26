export const api = async (url, opt = {}) => {
  const r = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opt.headers || {}) },
    ...opt,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const error = Error(d.error || "Something went wrong");
    error.code = d.code || (r.status === 401 ? "SESSION_EXPIRED" : "REQUEST_FAILED");
    error.status = r.status;
    throw error;
  }
  return d;
};
