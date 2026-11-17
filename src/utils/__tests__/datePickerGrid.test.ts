import fs from 'fs';
import path from 'path';

// The trip form's date picker lays out 7 day cells per row with flexWrap: if
// 7 cells do not fit in the card, the 7th wraps and every date ends up under
// the wrong weekday (it happened from June to November 2026: the card was 296
// wide, the 7 cells needed 273 of the 262 available).
const form = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'TripForm.tsx'), 'utf8');

const num = (re: RegExp): number => {
    const m = form.match(re);
    if (!m) throw new Error(`not found: ${re}`);
    return Number(m[1]);
};

describe('trip form date picker grid', () => {
    const style = (name: string) => {
        const m = form.match(new RegExp(`\\n\\s+${name}: \\{([^}]*)\\}`));
        if (!m) throw new Error(`style ${name} not found`);
        return m[1];
    };

    it('7 day cells fit in one row, so every date sits under its weekday', () => {
        const card = style('datePickerCard');
        const cell = style('calendarCell');
        const width = Number(card.match(/width: (\d+)/)![1]);
        const padding = Number(card.match(/padding: (\d+)/)![1]);
        const border = Number(card.match(/borderWidth: (\d+)/)![1]);
        const cellW = Number(cell.match(/width: (\d+(?:\.\d+)?)/)![1]);
        const cellM = Number(cell.match(/marginHorizontal: (\d+(?:\.\d+)?)/)![1]);
        const available = width - 2 * padding - 2 * border;
        expect(7 * (cellW + 2 * cellM)).toBeLessThanOrEqual(available);
    });

    it('the weekday headers use the same column width as the day cells', () => {
        const cell = style('calendarCell');
        const head = style('calendarWeekday');
        expect(head.match(/width: (\d+)/)![1]).toBe(cell.match(/width: (\d+)/)![1]);
        expect(head.match(/marginHorizontal: ([\d.]+)/)![1]).toBe(cell.match(/marginHorizontal: ([\d.]+)/)![1]);
    });

    it('weeks start on Monday: the offset of the 1st is (getDay() + 6) % 7', () => {
        expect(form).toContain('(new Date(dateYear, dateMonth, 1).getDay() + 6) % 7');
        // 1 November 2026 is a Sunday: 6 empty cells before it.
        expect((new Date(2026, 10, 1).getDay() + 6) % 7).toBe(6);
        expect(num(/padding: (\d+), width: \d+ \}/)).toBe(16);
    });
});
