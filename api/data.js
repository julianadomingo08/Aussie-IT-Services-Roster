// Aussie IT Services Australia - roster API (Vercel serverless function)
// GET  /api/data  -> {role, data}   (header x-pass: viewer or admin password)
// POST /api/data  -> saves {data}   (admin password only)
const crypto = require("crypto");
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const same = (a, b) => {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
async function redis(cmds) {
  const r = await fetch(URL_ + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error("store " + r.status);
  return r.json();
}
const EMPTY = { staff: [], days: {}, notes: {}, hours: "10:00 - 6PM", formUrl: "" };

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const pass = req.headers["x-pass"] || "";
  let role = null;
  if (process.env.ADMIN_PASSWORD && same(pass, process.env.ADMIN_PASSWORD)) role = "admin";
  else if (process.env.VIEW_PASSWORD && same(pass, process.env.VIEW_PASSWORD)) role = "viewer";
  if (!role) {
    await new Promise((r) => setTimeout(r, 800)); // slow down password guessing
    return res.status(401).json({ error: "Wrong password" });
  }
  try {
    if (req.method === "GET") {
      const [g] = await redis([["GET", "roster"]]);
      return res.status(200).json({ role, data: g.result ? JSON.parse(g.result) : EMPTY });
    }
    if (req.method === "POST") {
      if (role !== "admin") return res.status(403).json({ error: "Admin only" });
      const d = req.body && req.body.data;
      if (!d || !Array.isArray(d.staff) || !d.days || typeof d.days !== "object")
        return res.status(400).json({ error: "Bad data" });
      const str = JSON.stringify(d);
      if (str.length > 900000) return res.status(413).json({ error: "Too large" });
      const [g] = await redis([["GET", "roster"]]);
      const cmds = [["SET", "roster", str]];
      if (g.result) {
        // keep the previous version for the audit trail (last 200 changes)
        cmds.push(["LPUSH", "roster:history", JSON.stringify({ at: new Date().toISOString(), data: JSON.parse(g.result) })]);
        cmds.push(["LTRIM", "roster:history", 0, 199]);
      }
      await redis(cmds);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "Storage error. Check the Upstash connection and environment variables." });
  }
};
