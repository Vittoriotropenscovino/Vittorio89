// ISO-3166 alpha-2 country code → continent.
// Continent identifiers are internal English keys (never shown to the user —
// the UI only displays the COUNT of distinct continents), so no i18n is needed.
// Transcontinental countries are assigned to a single continent following the
// common country-to-continent convention (e.g. RU→Europe, TR→Asia, CY→Asia).

export type Continent =
    | 'Europe'
    | 'Asia'
    | 'Africa'
    | 'North America'
    | 'South America'
    | 'Oceania'
    | 'Antarctica';

const BY_CONTINENT: Record<Continent, string[]> = {
    Europe: [
        'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FO',
        'FI', 'FR', 'DE', 'GI', 'GR', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'GG',
        'XK', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO',
        'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'UA',
        'GB', 'VA', 'AX', 'SJ',
    ],
    Asia: [
        'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'CY', 'GE', 'HK',
        'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KW', 'KG', 'LA', 'LB',
        'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'KP', 'OM', 'PK', 'PS', 'PH', 'QA',
        'SA', 'SG', 'KR', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE',
        'UZ', 'VN', 'YE',
    ],
    Africa: [
        'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG',
        'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN',
        'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA',
        'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA',
        'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW',
    ],
    'North America': [
        'AI', 'AG', 'AW', 'BS', 'BB', 'BZ', 'BM', 'BQ', 'VG', 'CA', 'KY', 'CR',
        'CU', 'CW', 'DM', 'DO', 'SV', 'GL', 'GD', 'GP', 'GT', 'HT', 'HN', 'JM',
        'MQ', 'MX', 'MS', 'NI', 'PA', 'PR', 'BL', 'KN', 'LC', 'MF', 'PM', 'VC',
        'SX', 'TT', 'TC', 'US', 'VI',
    ],
    'South America': [
        'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'FK', 'GF', 'GY', 'PY', 'PE', 'SR',
        'UY', 'VE',
    ],
    Oceania: [
        'AS', 'AU', 'CK', 'FJ', 'PF', 'GU', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ',
        'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'WS', 'SB', 'TK', 'TO', 'TV', 'VU',
        'WF',
    ],
    Antarctica: ['AQ', 'BV', 'GS', 'HM', 'TF'],
};

export const ISO2_TO_CONTINENT: Record<string, Continent> = Object.entries(
    BY_CONTINENT
).reduce((acc, [continent, codes]) => {
    codes.forEach((code) => {
        acc[code] = continent as Continent;
    });
    return acc;
}, {} as Record<string, Continent>);

/** Map an ISO-3166 alpha-2 code (case-insensitive) to its continent, or null. */
export const continentForCountryCode = (
    countryCode?: string
): Continent | null => {
    if (!countryCode) return null;
    return ISO2_TO_CONTINENT[countryCode.toUpperCase()] ?? null;
};
