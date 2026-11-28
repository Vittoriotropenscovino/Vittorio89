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

describe('calendar of trips: same height every month', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'CalendarView.tsx'), 'utf8');
    it('the grid always has 6 rows (42 cells), even in a 4-row February', () => {
        const { CALENDAR_CELLS } = require('../calendarGrid');
        expect(CALENDAR_CELLS).toBe(42);
        expect(src).toContain('while (days.length < CALENDAR_CELLS) days.push(null);');
        // February 2027 starts on a Monday and has 28 days: 4 rows of real days
        const first = (new Date(2027, 1, 1).getDay() + 6) % 7;
        expect(first + 28).toBe(28);
    });
    it('the card is anchored at the top, so the month arrows never move', () => {
        expect(src).toMatch(/overlay: \{[^}]*justifyContent: 'flex-start'/);
    });
    it('the title is on one line, sized from the room left by the Close button', () => {
        expect(src).toContain("fitFontSize(t('calendarTitle') as string, titleRoom, 20, 14, fontScale)");
        expect(src).toMatch(/numberOfLines=\{1\}>\{t\('calendarTitle'\)\}/);
    });
});

describe('landscape: all six weeks in sight', () => {
    const { landscapeRowHeight } = require('../calendarGrid');
    it('enough room: half the column as in 1.3.0', () => {
        expect(landscapeRowHeight(65, 400)).toBe(33);
    });
    it('360-point phone at 130%: rows lower so the 6th week is not cut off', () => {
        expect(landscapeRowHeight(65, 193)).toBe(32);
        expect(6 * landscapeRowHeight(65, 193)).toBeLessThanOrEqual(193);
    });
    it('never below 24 points; not measured yet = 1.3.0 height', () => {
        expect(landscapeRowHeight(65, 60)).toBe(24);
        expect(landscapeRowHeight(65, 0)).toBe(33);
    });
});
