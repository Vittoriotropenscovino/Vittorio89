/**
 * Convert ISO 3166-1 alpha-2 country code to flag emoji
 * e.g., "it" -> "🇮🇹", "fr" -> "🇫🇷"
 */
export const isoToFlag = (code: string): string => {
    if (!code || code.length !== 2) return '🌍';
    const codePoints = code.toUpperCase().split('').map(
        char => 127397 + char.charCodeAt(0)
    );
    return String.fromCodePoint(...codePoints);
};

/**
 * Get flag for a country name (fallback if no country code)
 */
export const getCountryFlag = (countryCode?: string): string => {
    if (countryCode) {
        return isoToFlag(countryCode);
    }
    return '🌍';
};
