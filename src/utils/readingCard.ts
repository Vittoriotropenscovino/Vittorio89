// 1.4.0 block J: size of the reading windows (Privacy, Terms, Guide).
//
// Before: 80% of the height in portrait and 85-90% in landscape, without looking
// at the status bar and the navigation bar. Now the window stays inside the safe
// area with a 12-point margin, and in portrait it is 92% wide (plan, point 10).

export const READING_MAX_WIDTH = 550;

export function readingCardSize(
    winW: number,
    winH: number,
    insetTop: number,
    insetBottom: number,
): { width: number; height: number } {
    const portrait = winH >= winW;
    const width = Math.min(Math.round(winW * (portrait ? 0.92 : 0.9)), READING_MAX_WIDTH);
    const safe = winH - insetTop - insetBottom - 24;
    const height = Math.max(200, Math.round(Math.min(safe, winH * (portrait ? 0.88 : 0.94))));
    return { width, height };
}
