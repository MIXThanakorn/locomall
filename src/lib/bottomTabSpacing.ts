// Keep the menu above either the Android navigation bar or iOS home indicator.
// Include extra breathing room even on devices whose bottom inset is zero.
export function bottomTabSpacing(bottomInset: number) {
  const safeBottom = Number.isFinite(bottomInset) ? Math.max(0, bottomInset) : 0;
  const paddingBottom = safeBottom + 12;
  return { height: 56 + paddingBottom, paddingBottom, paddingTop: 8 };
}
