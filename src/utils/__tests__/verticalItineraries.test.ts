import fs from 'fs';
import path from 'path';
import { translations } from '../../i18n/translations';

// 1.4.0 block I: Itineraries and the "which trip?" list for overlapping pins.
const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', '..', 'components', f), 'utf8');

describe('itineraries (block I)', () => {
    const src = read('ItineraryManager.tsx');

    it('Play, Rename and Delete are written buttons, not bare icons', () => {
        expect(src).toContain("{t('itineraryPlay')}");
        expect(src).toContain("{t('itineraryRename')}");
        expect(src).toContain("{t('delete')}");
        expect(src).toContain("<Text style={styles.closeBtnText}>{t('close')}</Text>");
    });

    it('the new labels exist in all 8 languages', () => {
        for (const [lang, tr] of Object.entries(translations as Record<string, Record<string, unknown>>)) {
            expect({ lang, play: typeof tr.itineraryPlay, rename: typeof tr.itineraryRename })
                .toEqual({ lang, play: 'string', rename: 'string' });
        }
    });

    it('in portrait the window is 92% wide and stays inside the safe area', () => {
        expect(src).toContain("isPortrait && { width: '92%', maxHeight: winH - insets.top - insets.bottom - 24 }");
    });
});

describe('which trip? list (PinSelector, block I)', () => {
    const src = read('PinSelector.tsx');

    it('the list is up to 60% of the screen in portrait (it was 300 high)', () => {
        expect(src).toContain('isPortrait && { maxHeight: height * 0.6 }');
    });

    it('dates in the language of the app, not 2024-03-10', () => {
        expect(src).toContain('formatTripDate(item.date, language)');
        expect(src).not.toMatch(/' · ' \+ item\.date/);
    });

    it('Close is written', () => {
        expect(src).toContain("<Text style={styles.closeBtnText}>{ts('close')}</Text>");
    });
});
