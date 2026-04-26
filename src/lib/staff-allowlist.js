// Single source of truth for which emails may access /staff.
// Edge-safe: no node:* imports, only env reads.

export function getAllowedEmails() {
  return (process.env.STAFF_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email) {
  if (typeof email !== "string" || !email) return false;
  const list = getAllowedEmails();
  if (list.length === 0) return false; // closed by default
  return list.includes(email.trim().toLowerCase());
}
