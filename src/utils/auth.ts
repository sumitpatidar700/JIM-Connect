/**
 * Helper to get the first name or a formatted name from email if name is missing.
 */
export function getDisplayFirstName(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    return name.trim().split(" ")[0];
  }

  if (email?.trim()) {
    const localPart = email.trim().split("@")[0] ?? "";
    const normalized = localPart.replace(/[._-]+/g, " ").trim();
    if (normalized) {
      return normalized
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }

  return "There";
}

/**
 * Helper to get initials from a name.
 */
export function getInitials(name?: string | null) {
  const parts = name?.trim().split(" ").filter(Boolean) ?? [];
  if (parts.length === 0) {
    return "JC";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
