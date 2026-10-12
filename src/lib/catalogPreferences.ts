export function catalogPreferenceKey(userId: string) {
  return `locomall-catalog-same-area-v1:${userId}`;
}

// No location, credentials or session data is stored in this preference.
export function parseSameAreaPreference(value: string | null) {
  return value === "true";
}
