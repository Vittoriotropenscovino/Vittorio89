// Calendar of trips (CalendarView): the 7 columns are measured in WHOLE points.
//
// Before 1.4.0 every day cell was "1/7 of the row" in percent (14.2857%): Android
// rounds the decimals differently from row to row, and the weekday row (L M M G V
// S D) was built another way, so the columns did not fall exactly one under the
// other ("righe storte"). Now the real width of the grid is measured once, one
// cell width in whole points is computed from it and used for BOTH the weekday
// row and the days.

/** Width of one column, in whole points, for a grid `gridWidth` wide (0 while not measured). */
export function calendarCellSize(gridWidth: number): number {
    if (!(gridWidth > 0)) return 0;
    return Math.floor(gridWidth / 7);
}

/**
 * Monday-first one-letter weekday names in the app language, from Intl like the
 * date picker of the trip form (before 1.4.0 only English and Italian existed:
 * German, French... showed the Italian L M M G V S D).
 */
export function weekdayLetters(language: string): string[] {
    // 1 January 2024 is a Monday
    return Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, i + 1).toLocaleDateString(language, { weekday: 'narrow' }).toUpperCase()
    );
}

/** Cells in the grid: always 6 weeks, so the card has the same height every month. */
export const CALENDAR_CELLS = 6 * 7;
