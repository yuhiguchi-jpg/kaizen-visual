export function formatDisplayName(
  name: string | null | undefined,
  fallback = "-",
) {
  const normalizedName = name?.trim().replace(/\s+/g, " ");

  if (!normalizedName) return fallback;
  return normalizedName;
}
