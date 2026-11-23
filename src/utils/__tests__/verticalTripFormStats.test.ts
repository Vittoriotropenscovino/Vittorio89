import fs from 'fs';
import path from 'path';

// 1.4.0 blocks E (trip form) and F (statistics) in portrait. Source checks for the
// things found on the emulator, so they do not come back.
const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', '..', 'components', f), 'utf8');

describe('trip form in portrait (block E)', () => {
    const src = read('TripForm.tsx');

    it('"Add Pin" is outside the scroll, always in sight at the bottom', () => {
        const scrollEnd = src.lastIndexOf('</ScrollView>');
        const save = src.indexOf('testID="trip-save"');
        expect(save).toBeGreaterThan(scrollEnd);
        expect(src).toContain('styles.footer');
    });

    it('the page moves up with the keyboard, so "Add Pin" stays above it', () => {
        expect(src).toMatch(/Keyboard\.addListener\('keyboardDidShow'/);
        expect(src).toMatch(/SCREEN_HEIGHT - insets\.top - 8 - keyboardH/);
    });

    it('the scroll fills the page (flexGrow 0 of the old style must not win over flex: 1)', () => {
        expect(src).toContain('{ flexGrow: 1, flexShrink: 1, flexBasis: 0 }');
    });

    it('turning the phone with the form open does not leave it blank', () => {
        // the card changes its corners between portrait and landscape: no clip on it
        const m = src.match(/\n\s+blurContainer: \{([^}]*)\}/);
        expect(m).not.toBeNull();
        expect(m![1]).not.toContain('overflow');
        // the opening animation does not change while the form is open
        expect(src).toContain('animationType={openAnim.current}');
    });

    it('photos in a grid of 3 per row in portrait, counting padding and border', () => {
        expect(src).toMatch(/Math\.floor\(\(SCREEN_WIDTH - 40 - 2 - 2 \* MEDIA_GAP\) \/ 3\) - 1/);
        // 3 thumbnails + 2 gaps fit in the content width of a 360 and a 430 wide phone
        for (const w of [360, 392, 411, 430]) {
            const gap = 10;
            const thumb = Math.floor((w - 40 - 2 - 2 * gap) / 3) - 1;
            expect(3 * thumb + 2 * gap).toBeLessThanOrEqual(w - 40 - 2);
        }
    });

    it('close and search buttons have written labels', () => {
        expect(src).toContain("<Text style={styles.closeBtnText}>{t('close')}</Text>");
        expect(src).toContain("<Text style={styles.searchBtnText}>{t('searchHome')}</Text>");
    });
});

describe('statistics (block F)', () => {
    const src = read('StatsScreen.tsx');

    it('countries visited in gold, trips and photos stay blue', () => {
        expect(src).toMatch(/testID="stats-countries" style=\{\[styles\.bigNum, styles\.bigNumGold\]\}/);
        expect(src).toMatch(/bigNumGold: \{ color: '#FBBF24' \}/);
    });

    it('"Share your globe" is gold, as on the main screen', () => {
        const m = src.match(/\n\s+shareBtn: \{([^}]*)\}/);
        expect(m![1]).toContain("backgroundColor: '#FBBF24'");
    });

    it('in portrait name + share sit at the bottom, outside the scroll', () => {
        expect(src).toContain('{isPortrait && <View style={styles.footer}>{shareBlock}</View>}');
        expect(src).toContain('{!isPortrait && shareBlock}');
    });
});
