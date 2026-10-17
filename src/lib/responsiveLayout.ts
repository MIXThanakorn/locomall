export const SCREEN_MAX_WIDTH = 960;

/** Logical pixels and font scale matter, not the physical size of a phone. */
export function responsiveMetrics(width: number, height: number, fontScale = 1) {
  const safeWidth = Number.isFinite(width) && width > 0 ? Math.min(width, SCREEN_MAX_WIDTH) : 320;
  const scale = Number.isFinite(fontScale) ? Math.max(1, fontScale) : 1;
  return {
    width: safeWidth,
    fontScale: scale,
    stack: safeWidth < 380 || scale >= 1.3,
    short: height < 600 || height / scale < 440,
    gap: 12,
    touchSize: 44,
    tabLabelSize: safeWidth < 360 ? 10 : 11,
  };
}
