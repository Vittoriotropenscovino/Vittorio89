import fs from 'fs';
import path from 'path';

// The "Where have you been?" rules that live in App.tsx, globe.html and the
// share code: checked on the sources, like countryCountConsistency does.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');
const app = read('App.tsx');
const globe = read('assets/globe.html');

describe('when "Where have you been?" opens', () => {
    it('opens by itself only right after the privacy consent, and only with nothing saved', () => {
        const firstRunCalls = app.match(/setCountryPicker\('firstRun'\)/g) || [];
        expect(firstRunCalls).toHaveLength(1);
        const gdpr = app.slice(app.indexOf('const handleGDPRAccept'), app.indexOf('const handleCountriesConfirm'));
        expect(gdpr).toContain("setCountryPicker('firstRun')");
        expect(gdpr).toMatch(/trips\.length === 0 && markedCountries\.length === 0/);
    });

    it('is always reachable from a labelled button on the main screen', () => {
        expect(app).toContain('testID="wb-open"');
        expect(app).toContain("onPress={() => setCountryPicker('normal')}");
        expect(app).toMatch(/testID="wb-open"[\s\S]{0,400}\{t\('wbTitle'\) as string\}/);
    });

    it('on confirm it saves, turns the globe and shows the result panel', () => {
        const confirm = app.slice(app.indexOf('const handleCountriesConfirm'), app.indexOf('const handleShareGlobe'));
        expect(confirm).toContain('setMarkedCountries(nextMarked)');
        expect(confirm).toContain('globeTargetFor(');
        expect(confirm).toContain('setAutoFlyTarget(target)');
        expect(confirm).toContain('setCountriesResultVisible(');
    });

    it('the result panel never stays on top of a form or another screen', () => {
        expect(app).toMatch(/if \(activeModal !== 'none' \|\| selectedTrip \|\| sidebarOpen\) setCountriesResultVisible\(false\)/);
    });

    it('"Add a trip here" follows the free-trip limit', () => {
        const click = app.slice(app.indexOf('const handleCountryClick'), app.indexOf('// The prefilled country'));
        expect(click).toContain('canAddTrip(nonWishlistTrips)');
        expect(click).toContain("openModal('paywall')");
        expect(click).toContain('diaryCountries.includes(code)');
    });
});

describe('rotation is free only in emulator test builds', () => {
    it('stays locked in landscape unless EXPO_PUBLIC_ROTAZIONE_LIBERA=1', () => {
        expect(app).toContain("process.env.EXPO_PUBLIC_ROTAZIONE_LIBERA === '1'");
        expect(app).toContain('ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)');
        const eas = JSON.parse(read('eas.json'));
        expect(JSON.stringify(eas)).not.toContain('ROTAZIONE_LIBERA');
    });
});

describe('globe: taps and small states', () => {
    it('a tap on a country tells RN its ISO code', () => {
        expect(globe).toContain('.onPolygonClick(');
        expect(globe).toContain("S({type:'countryClick',code:code})");
        expect(globe).toMatch(/_numericToIso\[_isoToNumeric\[_k\]\]=_k/);
    });

    it('visited small states without a shape glow as a dot, and the dot can be tapped', () => {
        expect(globe).toContain('_countryPoints=d.points||{}');
        expect(globe).toMatch(/isCountryDot:true/);
        expect(globe).toMatch(/if\(p&&p\.isCountryDot&&p\.countryCode\)/);
    });
});

describe('sharing is one shared piece of code', () => {
    it('Statistics and the main screen both use useShareGlobe', () => {
        expect(read('src/components/StatsScreen.tsx')).toContain('useShareGlobe()');
        expect(app).toContain('useShareGlobe()');
    });

    it('the review prompt after sharing is still there, untouched', () => {
        const hook = read('src/hooks/useShareGlobe.ts');
        expect(hook).toContain('requestReviewIfAppropriate().catch(() => {})');
        expect(hook.indexOf('await Sharing.shareAsync')).toBeLessThan(hook.indexOf('requestReviewIfAppropriate()'));
    });

    it('the card is captured from ShareCard, never from the globe WebView', () => {
        expect(app).toMatch(/<ShareCardCapture ref=\{captureHostRef\}/);
        expect(read('src/hooks/useShareGlobe.ts')).not.toMatch(/import[^\n]*(WebView|EarthGlobe)/);
        expect(read('src/hooks/useShareGlobe.ts')).not.toMatch(/captureRef|captureScreen/);
    });
});
