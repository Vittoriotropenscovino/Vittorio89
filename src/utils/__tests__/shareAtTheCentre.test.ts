import fs from 'fs';
import path from 'path';
import { PLAY_STORE_URL, shareCardUrl } from '../shareLink';

// Step 3 of 1.3.0: sharing from the main screen, card without "0 trips",
// UTM parameters on the QR. Checked on the sources, like the other wiring tests.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');
const app = read('App.tsx');
const card = read('src/components/ShareCard.tsx');
const stats = read('src/components/StatsScreen.tsx');
const sheet = read('src/components/ShareGlobeSheet.tsx');

describe('shareCardUrl (QR on the card)', () => {
    it('normal card: utm_source=sharecard, utm_campaign=card on the store link', () => {
        expect(shareCardUrl()).toBe(
            'https://play.google.com/store/apps/details?id=com.travelsphere.app&utm_source=sharecard&utm_campaign=card'
        );
        expect(shareCardUrl('card')).toBe(shareCardUrl());
    });

    it('year recap: utm_campaign=recap{year}', () => {
        expect(shareCardUrl('recap2026')).toBe(`${PLAY_STORE_URL}&utm_source=sharecard&utm_campaign=recap2026`);
    });

    it('never puts anything odd in the link', () => {
        expect(shareCardUrl('a b&c=d')).toBe(`${PLAY_STORE_URL}&utm_source=sharecard&utm_campaign=abcd`);
        expect(shareCardUrl('')).toBe(shareCardUrl('card'));
    });

    it('only the two parameters Play Console shows, nothing else', () => {
        const names = shareCardUrl().split('?')[1].split('&').map((p) => p.split('=')[0]);
        expect(names).toEqual(['id', 'utm_source', 'utm_campaign']);
    });

    it('the card prints that link in the QR', () => {
        expect(card).toContain('value={shareCardUrl(campaign)}');
    });
});

describe('sharing at the centre', () => {
    it('the main screen has a labelled share button as soon as there is one country', () => {
        expect(app).toMatch(/\{stats\.countries > 0 && \(\s*<TouchableOpacity testID="share-open"/);
        expect(app).toMatch(/testID="share-open"[\s\S]{0,400}\{t\('shareGlobe'\) as string\}/);
    });

    it('the result panel opens the same share sheet', () => {
        const handler = app.slice(app.indexOf('const handleShareGlobe'), app.indexOf('const handleCountryClick'));
        expect(handler).toContain('setShareSheetVisible(true)');
        expect(app).toContain('onShare={handleShareGlobe}');
    });

    it('Statistics blocks sharing only when there are no countries, not when there are no trips', () => {
        expect(stats).toContain('const noCountries = travelStats.countries === 0;');
        expect(stats).not.toContain('trips.length === 0');
    });

    it('the optional name is in the share sheet too, saved in the same setting', () => {
        expect(sheet).toContain('testID="share-name"');
        expect(sheet).toContain('updateSettings({ travelerName: trimmedName })');
    });

    it('a card with 0 trips never says "0 trips": countries, continents and % of the world', () => {
        expect(card).toContain('const noTrips = stats.trips === 0;');
        expect(card).toContain("label={t('cardWorldShort') as string}");
        const zeroBranch = card.slice(card.indexOf('{noTrips ? ('), card.indexOf(') : ('));
        expect(zeroBranch).not.toContain('cardTrips');
    });
});
