// Font size that lets a one-line title fit, computed instead of measured.
//
// adjustsFontSizeToFit is not reliable on Android (prova 3 on Vittorio's S25, system
// font at 115%: "Statistiche" came out clipped as "Statis", "Calendario Viaggi" wrapped
// onto two lines). Here the width is estimated character by character (bold Roboto,
// as a fraction of the font size) and multiplied by the system font scale (RN
// multiplies every fontSize by it); the size goes down until it fits, never below `min`.
//
// Checked on the S25: "Rotte di viaggio" at 13 × 115% measured 107 points, the table
// below gives 106.

const NARROW = new Set([...'iljI.,;:!|\'’·']);
const SEMI = new Set([...'ftr()-/']);
const WIDE_LATIN = new Set([...'mwMW@']);

function charUnits(ch: string): number {
    if (/[⺀-鿿豈-﫿＀-￯]/.test(ch)) return 1.0; // Chinese / Japanese
    if (ch === ' ') return 0.28;
    if (NARROW.has(ch)) return 0.27;
    if (SEMI.has(ch)) return 0.36;
    if (WIDE_LATIN.has(ch)) return 0.85;
    if (/[0-9]/.test(ch)) return 0.56;
    if (/\p{Lu}/u.test(ch)) return 0.66;
    if (/\p{Ll}/u.test(ch)) return 0.53;
    return 0.6;
}

export function estimateTextWidth(text: string, fontSize: number, fontScale = 1): number {
    let units = 0;
    for (const ch of text) units += charUnits(ch);
    return units * fontSize * fontScale;
}

// 8% safety margin for the size choice: at 130% "Calendario Viaggi" still came out
// as "Calendario Viag…" without it (bold titles run a little wider than the table)
const SAFETY = 0.92;

export function fitFontSize(text: string, availableWidth: number, base: number, min: number, fontScale = 1): number {
    if (!(availableWidth > 0) || !text) return base;
    availableWidth *= SAFETY;
    if (estimateTextWidth(text, base, fontScale) <= availableWidth) return base;
    const perPoint = estimateTextWidth(text, 1, fontScale);
    return Math.max(min, Math.floor(availableWidth / perPoint));
}
