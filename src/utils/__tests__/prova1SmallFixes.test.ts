import fs from 'fs';
import path from 'path';
import { translations } from '../../i18n/translations';

// 1.4.0, point 5 after the phone test of 22/11: the small things.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');
const app = read('App.tsx');

describe('point 6: "Cast to TV"', () => {
    const cast = app.slice(app.indexOf('const handleCastScreen'), app.indexOf('const handleToggleTravelLines'));

    it('Samsung Smart View first, then Android casting, then wireless display, then settings', () => {
        expect(app).toContain("const SAMSUNG_SMART_VIEW = 'applink://com.samsung.android.smartmirroring/launchActivity';");
        const order = ['Linking.openURL(SAMSUNG_SMART_VIEW)', "'android.settings.CAST_SETTINGS'", "'android.settings.WIFI_DISPLAY_SETTINGS'", 'Linking.openSettings()'];
        const pos = order.map((o) => cast.indexOf(o));
        expect(pos.every((p) => p > 0)).toBe(true);
        expect([...pos].sort((a, b) => a - b)).toEqual(pos);
    });

    it('a failure never reaches the screen: each step falls into the next one', () => {
        expect(cast).toContain('try { await open(); return; } catch { /* next one */ }');
        expect(cast).not.toContain('Alert');
    });

    it('no new permission or package query in the manifest config', () => {
        expect(read('app.json')).not.toMatch(/smartmirroring/);
    });
});

describe('point 5: small fixes', () => {
    it('"Edit" then X goes back to the open trip; saving does not', () => {
        expect(app).toContain('onDelete={handleDeleteTrip} onEdit={handleEditFromViewer} />');
        expect(app).toContain("<TripForm visible={activeModal === 'form'} onClose={handleFormClose}");
        const close = app.slice(app.indexOf('const handleFormClose'), app.indexOf('const handleSaveTrip'));
        expect(close).toContain('if (trip) selectTrip(trip);');
        const save = app.slice(app.indexOf('const handleSaveTrip'), app.indexOf('const handleSaveTrip') + 300);
        expect(save).toContain('editedFromViewer.current = null;');
    });

    it('the full-screen photo comes back to the trip viewer', () => {
        const full = read('src/components/PhotoFullscreen.tsx');
        expect(full).toContain('onClose: (index: number) => void;');
        expect(full).toContain('onPress={() => onClose(currentIndex)}');
        expect(full).toContain('onRequestClose={() => onClose(currentIndex)}');
        expect(read('src/components/MemoryViewer.tsx')).toContain('if (index !== currentIndex) goToIndex(index);');
    });

    it('"Fog of War" is translated in the Help (English keeps it)', () => {
        for (const lang of ['it', 'es', 'fr', 'de', 'pt'] as const) {
            expect((translations[lang] as Record<string, unknown>).helpFogTitle).not.toBe('Fog of War');
        }
    });

    it('"Add trip" is written as a normal phrase in DE/FR/ES/PT', () => {
        expect(translations.de.addTrip).toBe('Reise hinzufügen');
        expect(translations.fr.addTrip).toBe('Ajouter un voyage');
        expect(translations.es.addTrip).toBe('Añadir viaje');
        expect(translations.pt.addTrip).toBe('Adicionar viagem');
    });
});
