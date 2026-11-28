import fs from 'fs';
import path from 'path';
import { MODAL_BACKDROP, MODAL_CARD, SHEET_BACKGROUND } from '../surfaces';

// 1.4.0, phone test 22/11: in portrait the bright panel under the globe showed
// through every old window. Every window that opens over the main screen takes
// its background from utils/surfaces, and those backgrounds really cover.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');
const alpha = (rgba: string) => Number(rgba.match(/,\s*([0-9.]+)\)$/)![1]);

describe('window backgrounds cover the main screen', () => {
    it('the shared colours are (almost) opaque', () => {
        expect(alpha(MODAL_BACKDROP)).toBeGreaterThanOrEqual(0.85);
        expect(alpha(MODAL_CARD)).toBeGreaterThanOrEqual(0.97);
        expect(alpha(SHEET_BACKGROUND)).toBeGreaterThanOrEqual(0.95);
    });

    const windows = [
        'CalendarView', 'StatsScreen', 'ItineraryManager', 'SettingsScreen', 'TripForm', 'ReadingCard',
        'GDPRConsent', 'PaywallScreen', 'PinSelector', 'MemoryViewer',
        'ShareGlobeSheet', 'MarkedCountryDialog', 'CountriesResultPanel',
    ];

    it.each(windows)('%s uses the shared backgrounds', (name) => {
        const src = read(`src/components/${name}.tsx`);
        expect(src).toMatch(/from '\.\.\/utils\/surfaces'/);
        // no see-through window colour left behind (old values were 0.3-0.85)
        const styles = src.slice(src.indexOf('StyleSheet.create'));
        for (const m of styles.matchAll(/(overlay|content|formContainer|backdrop|card): \{[^}]*backgroundColor: 'rgba\([^)]*,\s*([0-9.]+)\)'/g)) {
            expect({ name, key: m[1], opaque: Number(m[2]) >= 0.95 }).toEqual({ name, key: m[1], opaque: true });
        }
    });

    // block J: Privacy, Terms and Guide no longer draw their own window
    it.each(['HelpGuide', 'PrivacyPolicy', 'TermsOfService'])('%s opens inside the shared ReadingCard', (name) => {
        const src = read(`src/components/${name}.tsx`);
        expect(src).toMatch(/from '\.\/ReadingCard'/);
        expect(src).not.toMatch(/<Modal/);
    });
});
