import { fitFontSize, estimateTextWidth } from '../fitText';

describe('text width estimate', () => {
    it('matches the measure taken on the S25: "Rotte di viaggio" at 13 × 115% ≈ 107 points', () => {
        const w = estimateTextWidth('Rotte di viaggio', 13, 1.15);
        expect(w).toBeGreaterThan(100);
        expect(w).toBeLessThan(112);
    });

    it('Chinese and Japanese characters count as square', () => {
        expect(estimateTextWidth('旅行日历', 10)).toBe(40);
    });

    it('narrow letters are narrower than wide ones', () => {
        expect(estimateTextWidth('iiii', 10)).toBeLessThan(estimateTextWidth('mmmm', 10));
    });
});

describe('font size that fits one line', () => {
    it('keeps the base size when there is room', () => {
        expect(fitFontSize('Reisekalender', 300, 20, 14, 1)).toBe(20);
    });

    it('goes down with a large system font and never below the minimum', () => {
        const room = 150;
        const size = fitFontSize('Calendario Viaggi', room, 20, 14, 1.3);
        expect(size).toBeLessThan(20);
        expect(size).toBeGreaterThanOrEqual(14);
        if (size > 14) expect(estimateTextWidth('Calendario Viaggi', size, 1.3)).toBeLessThanOrEqual(room);
        expect(fitFontSize('Calendrier des Voyages', 100, 20, 14, 1.3)).toBe(14);
    });
});
