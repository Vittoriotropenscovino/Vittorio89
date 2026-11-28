import { estimateTextWidth } from './fitText';

// 1.4.0 block L: "Add a trip here" (MarkedCountryDialog) sits next to "Cancel" only
// when its label fits; on a portrait phone the card is narrower than 380 and the
// label was cut off even at 100%. Then the two buttons go one under the other.
export const MARKED_CARD_W = 380;
const OVERLAY_PAD = 24;
const CARD_PAD = 20;
const GAP = 10;

export function markedCardWidth(winW: number, insetsSide: number): number {
    return Math.min(MARKED_CARD_W, winW - 2 * OVERLAY_PAD - insetsSide);
}

export function markedButtonsStacked(label: string, cardW: number, fontScale: number): boolean {
    const primaryW = ((cardW - 2 * CARD_PAD - GAP) * 1.6) / 2.6;
    // label + icon 18 + gap 6 + padding 2 × 10
    const labelW = estimateTextWidth(label, 15, fontScale) + 18 + 6 + 20;
    return labelW > primaryW * 0.95;
}
