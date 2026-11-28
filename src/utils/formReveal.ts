/**
 * 1.4.0 block N: how far the trip form must scroll so that the title field
 * (top at `top`, height `height`, in the scroll content) is fully in sight.
 * Returns null when it is already visible, so the form does not move for nothing.
 */
export function titleNeedsScroll(top: number, height: number, scrollY: number, viewH: number, margin = 8): number | null {
    if (viewH <= 0) return null;
    const bottom = top + height;
    if (top >= scrollY && bottom <= scrollY + viewH) return null;
    // the field taller than the window: show its top
    if (height + margin >= viewH) return Math.max(0, top - margin);
    return Math.max(0, bottom - viewH + margin);
}
