export function getGeoAdminEmails() {
  return String(process.env.GEO_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isGeoAdminEmail(email?: string | null) {
  if (!email) return false
  return getGeoAdminEmails().includes(email.trim().toLowerCase())
}
