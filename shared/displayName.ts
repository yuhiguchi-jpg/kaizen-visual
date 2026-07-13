export function formatReversedDisplayName(
  name: string | null | undefined,
  fallback = "-",
) {
  const normalizedName = name?.trim().replace(/\s+/g, " ");

  if (!normalizedName) return fallback;

  const nameParts = normalizedName.split(" ");
  return nameParts.length > 1
    ? nameParts.reverse().join(" ")
    : normalizedName;
}
