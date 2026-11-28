import fs from 'fs';
import path from 'path';
import { markedButtonsStacked, markedCardWidth, MARKED_CARD_W } from '../dialogButtons';
import { translations } from '../../i18n/translations';

// 1.4.0 block L: the 1.3.0 screens and the small ones inside the safe area in portrait.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');
const LANGS = Object.keys(translations) as (keyof typeof translations)[];

describe('"Add a trip here" is never cut off', () => {
    const label = (l: string) => (translations as any)[l].wbAddTripHere as string;

    it('portrait phone (384 points) at 100%: Italian goes one under the other, short English stays side by side', () => {
        const w = markedCardWidth(384, 0);
        expect(w).toBeLessThan(MARKED_CARD_W);
        expect(markedButtonsStacked(label('it'), w, 1)).toBe(true);
        expect(markedButtonsStacked(label('en'), w, 1)).toBe(false);
    });

    it('portrait at 130%: one under the other in every language written with letters', () => {
        const w = markedCardWidth(384, 0);
        for (const l of LANGS) {
            if (l === 'zh' || l === 'ja') continue;
            expect([l, markedButtonsStacked(label(l), w, 1.3)]).toEqual([l, true]);
        }
    });

    it('landscape: the card keeps its 380 width; English at 100% side by side as in 1.3.0', () => {
        const w = markedCardWidth(853, 48);
        expect(w).toBe(MARKED_CARD_W);
        expect(markedButtonsStacked(label('en'), w, 1)).toBe(false);
        expect(markedButtonsStacked(label('it'), w, 1.3)).toBe(true);
    });

    it('the dialog uses the helper and both orientations', () => {
        const src = read('src/components/MarkedCountryDialog.tsx');
        expect(src).toMatch(/markedButtonsStacked\(/);
        expect(src).toMatch(/supportedOrientations=\{ALL_ORIENTATIONS\}/);
    });
});

describe('offline banner', () => {
    const src = read('src/components/OfflineBanner.tsx');
    it('starts under the title (measured), not at a fixed 70 that covered it', () => {
        expect(src).not.toMatch(/top: 70/);
        const app = read('App.tsx');
        expect(app).toContain('setHeaderBottom(Math.round(e.nativeEvent.layout.y + e.nativeEvent.layout.height))');
        expect(app).toContain('<OfflineBanner top={headerBottom > 0 ? headerBottom - 8 : undefined} />');
    });
    it('kept off the side bars', () => {
        expect(src).toMatch(/insets\.left/);
        expect(src).toMatch(/insets\.right/);
    });
});

describe('save confirmation', () => {
    it('a long message wraps inside the screen', () => {
        const src = read('src/components/SaveConfirmation.tsx');
        expect(src).toMatch(/maxWidth: '86%'/);
        expect(src).toMatch(/textAlign: 'center'/);
    });
});

describe('trip form on a short screen', () => {
    const { titleNeedsScroll } = require('../formReveal');
    it('already in sight: the form does not move', () => {
        expect(titleNeedsScroll(120, 70, 0, 300)).toBeNull();
    });
    it('under the "Add Pin" button: scrolls just enough to show it whole', () => {
        // 360-point phone in landscape at 130%: about 165 points of form visible
        expect(titleNeedsScroll(150, 80, 0, 165)).toBe(150 + 80 - 165 + 8);
    });
    it('the form asks for it right after the place is found', () => {
        const src = read('src/components/TripForm.tsx');
        expect(src).toMatch(/setRevealTitle\(\(n\) => n \+ 1\)/);
        expect(src).toMatch(/ref=\{formScrollRef\}/);
    });
});
