// 1.4.0: trip dates are stored as "YYYY-MM-DD" and used to be shown that way.
// On screen they follow the app language: "10 mar 2024", "Mar 10, 2024",
// "10. März 2024", "2024年3月10日"... (TripForm already uses the same Intl call
// for its calendar). Anything that is not a plain date ("-", empty) is returned
// unchanged, and so is the stored value if Intl is not available.
export function formatTripDate(date: string | undefined | null, language: string): string {
    if (!date) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!m) return date;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (Number.isNaN(d.getTime())) return date;
    try {
        return d.toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return date;
    }
}
