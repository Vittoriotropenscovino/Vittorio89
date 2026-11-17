import fs from 'fs';
import path from 'path';
import { translations } from '../../i18n/translations';

// Step 4 of 1.3.0: the year recap. Checked on the sources, like the other wiring tests.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');
// Code only: comments may mention example years ("Dec 2026 → 2026").
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
const app = read('App.tsx');
const card = read('src/components/ShareCard.tsx');
const notice = read('src/components/RecapNotice.tsx');
const logic = read('src/utils/yearRecap.ts');
const sheet = read('src/components/ShareGlobeSheet.tsx');

const RECAP_KEYS = [
    'recapTitle', 'recapNewOne', 'recapNewMany', 'recapTotalOne', 'recapTotalMany',
    'recapNoticeReady', 'recapNoticeOpen', 'recapNoticeEmpty', 'recapShareTitle',
] as const;
const WITH_YEAR = ['recapTitle', 'recapNoticeReady', 'recapNoticeEmpty', 'recapShareTitle'];

describe('year recap texts', () => {
    const langs = Object.keys(translations) as (keyof typeof translations)[];

    it('exist in all 8 languages', () => {
        expect(langs.sort()).toEqual(['de', 'en', 'es', 'fr', 'it', 'ja', 'pt', 'zh']);
        for (const lang of langs) {
            const dict = translations[lang] as Record<string, unknown>;
            for (const key of RECAP_KEYS) {
                expect(typeof dict[key]).toBe('string');
                expect((dict[key] as string).length).toBeGreaterThan(0);
            }
        }
    });

    it('never write a year: they use {year}', () => {
        for (const lang of langs) {
            const dict = translations[lang] as unknown as Record<string, string>;
            for (const key of RECAP_KEYS) expect(dict[key]).not.toMatch(/20\d\d/);
            for (const key of WITH_YEAR) expect(dict[key]).toContain('{year}');
            expect(dict.recapNewMany).toContain('{count}');
            expect(dict.recapTotalMany).toContain('{count}');
            expect(dict.recapTotalMany).toContain('{pct}');
            expect(dict.recapTotalOne).toContain('{pct}');
        }
    });
});

describe('year recap wiring', () => {
    it('no year written in the recap code', () => {
        for (const src of [logic, notice, card, sheet]) expect(code(src)).not.toMatch(/\b20\d\d\b/);
    });

    it('the recap sheet uses QR campaign recap{year}', () => {
        expect(app).toContain('campaign={recapCampaign(yearRecap.year)}');
        expect(app).toContain('recap={yearRecap}');
        expect(logic).toContain('`recap${year}`');
    });

    it('the notice is closed per year in the settings', () => {
        expect(app).toContain('recapDismissedYears: dismissRecapYear(settings.recapDismissedYears, noticeYear)');
        expect(app).toContain('recapNoticeYear(now, settings.recapDismissedYears)');
    });

    it('with no trips in the year the notice invites to add one, through the free-limit check', () => {
        expect(app).toMatch(/<RecapNotice[\s\S]{0,300}onAddTrip=\{handleAddTrip\}/);
        expect(notice).toContain("hasTrips ? onOpen : onAddTrip");
    });

    it('the simulated date exists only in test builds', () => {
        expect(app).toContain("const TEST_TOOLS = FREE_ROTATION || process.env.EXPO_PUBLIC_STRUMENTI_PROVA === '1';");
        expect(app).toContain('const testDate = TEST_TOOLS ? TEST_DATES[');
        expect(app).toMatch(/\{TEST_TOOLS && \(\s*<TouchableOpacity\s+testID="date-dev"/);
    });

    it('every notice button has a written label', () => {
        expect(notice).toContain("t(hasTrips ? 'recapNoticeOpen' : 'wbAddTrip')");
        expect(notice).toContain("t('close')");
    });

    it('the recap card is the same ShareCard (never the globe WebView)', () => {
        expect(card).toContain('recap?: YearRecap | null;');
        expect(code(card)).not.toMatch(/WebView/);
    });
});
