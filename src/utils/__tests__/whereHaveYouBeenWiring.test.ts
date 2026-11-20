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

    it('"Add a trip here" is the app\'s own dialog, not the system alert', () => {
        const click = app.slice(app.indexOf('const handleCountryClick'), app.indexOf('// The prefilled country'));
        expect(click).not.toContain('Alert.alert');
        expect(click).toContain('setMarkedDialog({ code, name: countryName(code, language) })');
        expect(app).toMatch(/<MarkedCountryDialog country=\{markedDialog\} onAddTrip=\{handleMarkedAddTrip\}/);
        const dialog = read('src/components/MarkedCountryDialog.tsx');
        for (const id of ['marked-country-dialog', 'marked-country-add', 'marked-country-cancel']) {
            expect(dialog).toContain(`testID="${id}"`);
        }
        expect(dialog).toContain("t('wbAddTripHere')");
        expect(dialog).toContain("t('cancel')");
    });

    it('the numbers at the bottom left are one bar that opens Statistics, always the same three numbers', () => {
        const bar = app.slice(app.indexOf('testID="stats-bar"'), app.indexOf('"Where have you been?": always reachable'));
        expect(bar).toContain("openModalWithHaptic('stats')");
        expect(bar).toContain("t('statistics')");
        expect(bar).not.toMatch(/trips\.length > 0 &&/);
        expect((bar.match(/styles\.statValue/g) || []).length).toBe(3);
    });
});

describe('checkpoint 2 fixes', () => {
    const panel = read('src/components/CountriesResultPanel.tsx');
    const picker = read('src/components/CountryPickerScreen.tsx');

    it('the globe turns to the group of all lit countries', () => {
        expect(app).toContain('globeTargetFor(visited.codes)');
    });

    // 17/11: the small panel became a full page (point A of step 5): the same
    // country map as the share card, big, with the numbers and the two buttons.
    it('the result is a full page with the real country map, numbers and the two buttons', () => {
        expect(panel).toMatch(/<Modal\s+visible\s+transparent/);
        expect(panel).toMatch(/<CountryMap\s+gold=\{codes\}/);
        for (const id of ['wb-result', 'wb-result-count', 'wb-result-share', 'wb-result-add', 'wb-result-close', 'wb-result-map']) {
            expect(panel).toContain(`testID="${id}"`);
        }
        expect(panel).not.toMatch(/WebView|EarthGlobe/);
        expect(app).toContain('codes={visitedCountries}');
        expect(app).toContain('continents={stats.travelStats.continents}');
    });

    it('visited countries are gold on the globe, the same gold as the list', () => {
        expect(globe).toContain("if(isCountryVisited(d))return 'rgba(251,191,36,0.85)'");
        expect(globe).toContain("if(d.isCountryDot)return 'rgba(251,191,36,1)'");
        expect(picker).toContain("const GOLD = '#FBBF24'"); // #FBBF24 = rgb(251,191,36)
    });

    it('a row never changes size when ticked (no scale on the row)', () => {
        expect(picker).toContain('<View style={styles.cellWrap}>');
        expect(picker).not.toMatch(/cellWrap, { transform/);
    });

    it('first run says \"Skip for now\", from the main screen it says \"Close\"', () => {
        expect(picker).toContain("t(firstRun ? 'wbSkip' : 'close')");
    });
});

describe('1.4.0: portrait is the main mode, the phone rotates freely', () => {
    it('no orientation lock is left in the app', () => {
        expect(app).toContain('ScreenOrientation.unlockAsync()');
        expect(app).not.toContain('OrientationLock.LANDSCAPE');
        const cfg = JSON.parse(read('app.json')).expo;
        expect(cfg.orientation).toBe('default');
        const so = cfg.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-screen-orientation');
        expect(so[1].initialOrientation).toBe('DEFAULT');
    });

    it('the emulator flag only adds the card preview, never in store builds', () => {
        expect(app).toContain("process.env.EXPO_PUBLIC_ROTAZIONE_LIBERA === '1'");
        const eas = JSON.parse(read('eas.json'));
        expect(JSON.stringify(eas)).not.toContain('ROTAZIONE_LIBERA');
    });

    it('screen and Wi-Fi hardware features are declared optional (Play Console warning)', () => {
        const cfg = JSON.parse(read('app.json')).expo;
        expect(cfg.plugins).toContain('./plugins/withOptionalFeatures');
        const plugin = read('plugins/withOptionalFeatures.js');
        for (const f of ['android.hardware.screen.portrait', 'android.hardware.screen.landscape', 'android.hardware.wifi']) expect(plugin).toContain(f);
        expect(plugin).toContain("'android:required': 'false'");
    });

    it('every Modal declares both orientations (iPhone keeps a Modal in portrait otherwise)', () => {
        const dir = 'src/components';
        for (const f of fs.readdirSync(path.join(__dirname, '../../..', dir)).filter((n) => n.endsWith('.tsx'))) {
            const src = read(`${dir}/${f}`);
            const modals = src.match(/<Modal[^>]*>/g) || [];
            for (const m of modals) expect({ f, m: m.includes('supportedOrientations') }).toEqual({ f, m: true });
        }
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
    it('Statistics and the share sheet (main screen, result panel) both use useShareGlobe', () => {
        expect(read('src/components/StatsScreen.tsx')).toContain('useShareGlobe()');
        expect(read('src/components/ShareGlobeSheet.tsx')).toContain('useShareGlobe()');
        expect(app).toContain('<ShareGlobeSheet');
    });

    it('the review prompt after sharing is still there, untouched', () => {
        const hook = read('src/hooks/useShareGlobe.ts');
        expect(hook).toContain('requestReviewIfAppropriate().catch(() => {})');
        expect(hook.indexOf('await Sharing.shareAsync')).toBeLessThan(hook.indexOf('requestReviewIfAppropriate()'));
    });

    it('the card is captured from ShareCard, never from the globe WebView', () => {
        expect(read('src/components/ShareGlobeSheet.tsx')).toMatch(/<ShareCardCapture ref=\{captureHostRef\}/);
        expect(read('src/hooks/useShareGlobe.ts')).not.toMatch(/import[^\n]*(WebView|EarthGlobe)/);
        expect(read('src/hooks/useShareGlobe.ts')).not.toMatch(/captureRef|captureScreen/);
    });
});

describe('the globe at startup', () => {
    const earth = read('src/components/EarthGlobe.tsx');

    it('starts turned towards the biggest group of visited countries, like after confirm', () => {
        const ready = earth.slice(earth.indexOf("if (data.type === 'ready')"), earth.indexOf("data.type === 'countryClick'"));
        expect(ready).toContain('globeTargetFor(visitedCountries)');
        expect(ready).toContain("type: 'setView'");
        // no countries -> globeTargetFor returns null -> nothing is sent
        expect(ready).toMatch(/if \(start\) \{/);
        // a trip already selected wins over the startup view
        expect(ready).toContain('!targetCoordinates');
    });

    it('the globe page jumps there at once, keeping its zoom', () => {
        expect(globe).toContain("else if(d.type==='setView'&&globe)globe.pointOfView({lat:d.lat,lng:d.lng},0);");
    });

    it('the globe is mounted only after the saved data is loaded', () => {
        expect(app.indexOf('if (!isSettingsLoaded || isLoading)')).toBeGreaterThan(-1);
        expect(app.indexOf('if (!isSettingsLoaded || isLoading)')).toBeLessThan(app.indexOf('<EarthGlobe'));
    });
});
