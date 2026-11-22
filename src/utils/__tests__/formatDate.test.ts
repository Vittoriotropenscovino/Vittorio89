import fs from 'fs';
import path from 'path';
import { formatTripDate } from '../formatDate';

describe('formatTripDate', () => {
    it('shows the date in the app language, never "2024-03-10"', () => {
        for (const lang of ['it', 'en', 'es', 'fr', 'de', 'pt', 'zh', 'ja']) {
            const out = formatTripDate('2024-03-10', lang);
            expect(out).not.toBe('2024-03-10');
            expect(out).toContain('2024');
            expect(out).toContain('10');
        }
        expect(formatTripDate('2024-03-10', 'it').toLowerCase()).toContain('mar');
        expect(formatTripDate('2024-03-10', 'en')).toMatch(/Mar/);
    });

    it('leaves anything that is not a plain date alone', () => {
        expect(formatTripDate('-', 'it')).toBe('-');
        expect(formatTripDate('', 'it')).toBe('');
        expect(formatTripDate(undefined, 'it')).toBe('');
        expect(formatTripDate('marzo 2024', 'it')).toBe('marzo 2024');
    });
});

describe('the screens show formatted dates', () => {
    const read = (rel: string) => fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');
    it.each([
        ['src/components/MemoryViewer.tsx', 'formatTripDate(trip.date, language)'],
        ['src/components/TripSidebar.tsx', 'formatTripDate(item.date, language)'],
        ['src/components/StatsScreen.tsx', 'formatTripDate(stats.firstDate, language)'],
        ['src/components/TripForm.tsx', 'formatTripDate(date, language)'],
    ])('%s', (file, call) => {
        expect(read(file)).toContain(call);
    });
});
