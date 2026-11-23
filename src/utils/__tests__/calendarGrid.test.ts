import fs from 'fs';
import path from 'path';
import { calendarCellSize, weekdayLetters } from '../calendarGrid';

describe('calendar of trips: straight columns', () => {
    it('7 whole-point columns always fit in the measured width, wasting less than 7 points', () => {
        for (let w = 200; w <= 900; w += 0.5) {
            const c = calendarCellSize(w);
            expect(Number.isInteger(c)).toBe(true);
            expect(7 * c).toBeLessThanOrEqual(w);
            expect(w - 7 * c).toBeLessThan(7);
        }
    });

    it('nothing is drawn before the grid is measured', () => {
        expect(calendarCellSize(0)).toBe(0);
        expect(calendarCellSize(NaN)).toBe(0);
    });

    it('weekday row and day cells use the same measured column, not a percentage', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'CalendarView.tsx'), 'utf8');
        expect(src).not.toMatch(/100 \/ 7/);
        expect(src).toContain('calendarCellSize(');
        // both rows are sized from the same `cell`
        expect(src).toMatch(/weekDayCell, \{ width: cell \}/);
        expect(src).toMatch(/styles\.dayCell, \{ width: cell, height: cellH \}/);
    });
});

describe('calendar of trips: weekday letters in every language', () => {
    it('start on Monday and follow the language', () => {
        expect(weekdayLetters('it')).toEqual(['L', 'M', 'M', 'G', 'V', 'S', 'D']);
        expect(weekdayLetters('en')).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
        expect(weekdayLetters('de')).toEqual(['M', 'D', 'M', 'D', 'F', 'S', 'S']);
        expect(weekdayLetters('fr')).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
        expect(weekdayLetters('es')).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D']);
        for (const l of ['pt', 'zh', 'ja']) expect(weekdayLetters(l)).toHaveLength(7);
    });
});
