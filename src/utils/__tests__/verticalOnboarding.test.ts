import fs from 'fs';
import path from 'path';
import { readingCardSize, READING_MAX_WIDTH } from '../readingCard';

// 1.4.0 block J: first launch (languages, introduction), privacy consent,
// Privacy, Terms and Guide in both orientations and with big system fonts.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');

describe('reading windows (Privacy, Terms, Guide) stay inside the safe area', () => {
    it('portrait: 92% wide, never under the status or navigation bar', () => {
        // emulator 1080x2400 at density 450 = 384 x 853 points, bars 24 + 48
        const { width, height } = readingCardSize(384, 853, 24, 48);
        expect(width).toBe(Math.round(384 * 0.92));
        expect(height).toBeLessThanOrEqual(853 - 24 - 48 - 24);
    });

    it('landscape: as tall as the safe area allows, no wider than before', () => {
        const { width, height } = readingCardSize(853, 384, 24, 0);
        expect(width).toBe(READING_MAX_WIDTH);
        expect(height).toBeLessThanOrEqual(384 - 24 - 24);
        expect(height).toBeGreaterThan(384 * 0.8);
    });

    it('a narrow 360 phone still gets a usable window', () => {
        const { width, height } = readingCardSize(360, 740, 24, 48);
        expect(width).toBeGreaterThan(320);
        expect(height).toBeGreaterThan(500);
    });
});

describe('first launch reads the CURRENT window size', () => {
    const src = read('src/components/OnboardingScreen.tsx');

    it('no size read once at startup', () => {
        expect(src).not.toMatch(/Dimensions\.get/);
        expect(src).toMatch(/useOrientation\(\)/);
    });

    it('after a rotation it goes back to the same page', () => {
        expect(src).toMatch(/scrollToOffset\(\{ offset: currentIndex \* winW/);
        expect(src).toMatch(/getItemLayout/);
    });

    it('"Next" is written, not only an arrow', () => {
        expect(src).toMatch(/testID="onboarding-next"[\s\S]{0,400}\{t\('next'\)\}/);
    });
});

describe('privacy consent', () => {
    const src = read('src/components/GDPRConsent.tsx');

    it('the text scrolls and the button stays outside the scroll', () => {
        const scrollEnd = src.indexOf('</ScrollView>');
        expect(scrollEnd).toBeGreaterThan(0);
        expect(src.indexOf('testID="gdpr-accept"')).toBeGreaterThan(scrollEnd);
    });

    it('fits inside the safe area and does not go blank after rotating', () => {
        expect(src).toMatch(/maxHeight = winH - insets\.top - insets\.bottom/);
        const styles = src.slice(src.indexOf('StyleSheet.create'));
        expect(styles).not.toMatch(/overflow: 'hidden'/);
    });
});
