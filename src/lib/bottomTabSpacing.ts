// Keep the menu above either the Android navigation bar or iOS home indicator.
// Include extra breathing room even on devices whose bottom inset is zero.
export function bottomTabSpacing(bottomInset: number, fontScale = 1) {
  const safeBottom = Number.isFinite(bottomInset) ? Math.max(0, bottomInset) : 0;
  const paddingBottom = safeBottom + 12;
  const scale = Number.isFinite(fontScale) ? Math.max(1, fontScale) : 1;
  // Icon + two label lines: never overlap the gesture bar at large text sizes.
  const contentHeight = Math.max(72, 44 + Math.ceil(28 * scale));
  return { height: contentHeight + paddingBottom, paddingBottom, paddingTop: 8 };
}
