export function backFallback(segments: readonly string[]): string {
  if (segments[0] === "(auth)") {
    if (segments[1] === "sign-in") return "/(auth)/splash";
    if (segments[1] === "phone-onboarding") return "/(auth)/switch-account";
    return "/(auth)/sign-in";
  }
  if (segments[0] === "chat") return "/(tabs)/chat";
  if (segments[0] === "(tabs)" || segments[0] === "catalog" || segments[0] === "order"
    || (segments[0] === "market" && segments[1] !== "manage" && segments[1] !== "create")
    || (segments[0] === "store" && segments[1] !== "manage")) return "/(tabs)";
  return "/(tabs)/setting";
}
