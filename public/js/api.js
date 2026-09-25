export const api = async (url, opt = {}) => {
  const r = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opt.headers || {}) },
    ...opt,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || "Something went wrong");
  return d;
};
