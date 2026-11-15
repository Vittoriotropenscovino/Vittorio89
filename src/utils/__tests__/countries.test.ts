import {
    WORLD_COUNTRIES, WORLD_COUNTRY_COUNT, isWorldCountry, worldPercent, worldPercentLabel,
    foldText, countryName, countryCodeFromName, countrySearchNames,
    sanitizeCountryCodes, mergeCountryCodes,
} from '../countries';
import { COUNTRY_NAMES, COUNTRY_NAME_LANGS } from '../../i18n/countryNames';
import { continentForCountryCode } from '../countryContinents';

describe('the world list (denominator of "% of the world")', () => {
    it('has 197 countries: 193 UN + Vatican, Palestine, Taiwan, Kosovo', () => {
        expect(WORLD_COUNTRY_COUNT).toBe(197);
        expect(new Set(WORLD_COUNTRIES).size).toBe(197); // no duplicates
        for (const code of ['VA', 'PS', 'TW', 'XK', 'IT', 'US', 'SS']) expect(isWorldCountry(code)).toBe(true);
    });

    it('leaves dependent territories out (they still count when travelled)', () => {
        for (const code of ['GL', 'PR', 'HK', 'MO', 'RE', 'AQ', 'FO']) expect(isWorldCountry(code)).toBe(false);
    });

    it('every country has a code the globe understands (Kosovo included)', () => {
        const fs = require('fs');
        const path = require('path');
        const html: string = fs.readFileSync(path.join(__dirname, '../../../assets/globe.html'), 'utf8');
        const map = html.match(/var _isoToNumeric=\{([^}]*)\}/)![1];
        const known = new Set(Array.from(map.matchAll(/([A-Z]{2}):'/g), (m) => m[1]));
        expect(WORLD_COUNTRIES.filter((c) => !known.has(c))).toEqual([]);
        // Natural Earth has Kosovo without an id: globe.html gives it XK's '926'.
        expect(map).toContain("XK:'926'");
        expect(html).toMatch(/properties\.name==='Kosovo'\)ft\.id='926'/);
    });

    it('every country has a name in the 8 languages and a continent', () => {
        expect(COUNTRY_NAME_LANGS).toEqual(['it', 'en', 'es', 'fr', 'de', 'pt', 'zh', 'ja']);
        for (const code of WORLD_COUNTRIES) {
            const row = COUNTRY_NAMES[code];
            expect(row).toHaveLength(8);
            row.forEach((name) => expect(name.length).toBeGreaterThan(1));
            expect(continentForCountryCode(code)).not.toBeNull();
        }
    });
});

describe('worldPercent', () => {
    it('divides by 197 and rounds', () => {
        expect(worldPercent(0)).toBe(0);
        expect(worldPercent(20)).toBe(10);   // 10.15%
        expect(worldPercent(12)).toBe(6);    // 6.09%
        expect(worldPercent(197)).toBe(100);
    });

    it('is capped at 100 (territories can push the count past 197)', () => {
        expect(worldPercent(230)).toBe(100);
    });

    it('labels a tiny share "<1" but zero as "0"', () => {
        expect(worldPercentLabel(1)).toBe('1');  // 0.51% rounds to 1
        expect(worldPercentLabel(0)).toBe('0');
        expect(worldPercentLabel(20)).toBe('10');
    });
});

describe('foldText', () => {
    it('ignores case, accents and punctuation', () => {
        expect(foldText('Côte d’Ivoire')).toBe('cote d ivoire');
        expect(foldText("Côte d'Ivoire")).toBe('cote d ivoire');
        expect(foldText('ÖSTERREICH')).toBe('osterreich');
        expect(foldText('  São   Tomé ')).toBe('sao tome');
        expect(foldText('Großbritannien')).toBe('grossbritannien');
        expect(foldText('Türkiye')).toBe('turkiye');
    });

    it('leaves Chinese and Japanese as they are', () => {
        expect(foldText('意大利')).toBe('意大利');
        expect(foldText('ボスニア・ヘルツェゴビナ')).toBe('ボスニア ヘルツェゴビナ');
    });
});

describe('countryName', () => {
    it('returns the name in the app language, English for an unknown language', () => {
        expect(countryName('DE', 'it')).toBe('Germania');
        expect(countryName('DE', 'ja')).toBe('ドイツ');
        expect(countryName('DE', 'xx')).toBe('Germany');
        expect(countryName('ZZ', 'it')).toBe('ZZ');
    });

    it('uses plain names where CLDR is awkward', () => {
        expect(countryName('PS', 'it')).toBe('Palestina');
        expect(countryName('CD', 'it')).toBe('Repubblica Democratica del Congo');
        expect(countryName('CG', 'en')).toBe('Republic of the Congo');
    });

    it('search names include the aliases (USA finds the United States)', () => {
        expect(countrySearchNames('US')).toEqual(expect.arrayContaining(['Stati Uniti', 'USA']));
    });
});

describe('countryCodeFromName', () => {
    it('recognizes a country in any of the 8 languages', () => {
        expect(countryCodeFromName('Italia')).toBe('IT');
        expect(countryCodeFromName('Italy')).toBe('IT');
        expect(countryCodeFromName('Italie')).toBe('IT');
        expect(countryCodeFromName('意大利')).toBe('IT');
        expect(countryCodeFromName('イタリア')).toBe('IT');
        expect(countryCodeFromName('Giappone')).toBe('JP');
        expect(countryCodeFromName('Alemania')).toBe('DE');
    });

    it('ignores case and accents', () => {
        expect(countryCodeFromName('ITALIA')).toBe('IT');
        expect(countryCodeFromName('Mexico')).toBe('MX');
        expect(countryCodeFromName('Ital')).toBeUndefined(); // a partial name is never guessed
        expect(countryCodeFromName("cote d'ivoire")).toBe('CI');
    });

    it('knows the long names geocoders return and common aliases', () => {
        expect(countryCodeFromName("Stati Uniti d'America")).toBe('US');
        expect(countryCodeFromName('USA')).toBe('US');
        expect(countryCodeFromName('United States of America')).toBe('US');
        expect(countryCodeFromName('Regno Unito')).toBe('GB');
        expect(countryCodeFromName('England')).toBe('GB');
        expect(countryCodeFromName('Repubblica Ceca')).toBe('CZ');
        expect(countryCodeFromName('Deutschland')).toBe('DE');
        expect(countryCodeFromName('Österreich')).toBe('AT');
        expect(countryCodeFromName('Myanmar')).toBe('MM');
        expect(countryCodeFromName('Territori Palestinesi')).toBe('PS');
        expect(countryCodeFromName('Congo - Kinshasa')).toBe('CD');
    });

    it('keeps territories as their own code, as before', () => {
        expect(countryCodeFromName('Puerto Rico')).toBe('PR');
        expect(countryCodeFromName('Hong Kong')).toBe('HK');
    });

    it('returns undefined for unknown or empty names', () => {
        expect(countryCodeFromName('Terra di Nessuno')).toBeUndefined();
        expect(countryCodeFromName('')).toBeUndefined();
        expect(countryCodeFromName(undefined)).toBeUndefined();
    });
});

describe('sanitizeCountryCodes / mergeCountryCodes', () => {
    it('keeps known codes only, uppercased, without duplicates, in order', () => {
        expect(sanitizeCountryCodes(['it', 'FR', 'IT', 'ZZ', 'ITA', 3, null, ' jp '])).toEqual(['IT', 'FR', 'JP']);
        expect(sanitizeCountryCodes('IT')).toEqual([]);
        expect(sanitizeCountryCodes(undefined)).toEqual([]);
    });

    it('merges as a union and reports how many are new', () => {
        expect(mergeCountryCodes(['IT', 'FR'], ['FR', 'JP', 'BR'])).toEqual({ merged: ['IT', 'FR', 'JP', 'BR'], added: 2 });
        expect(mergeCountryCodes(['IT'], [])).toEqual({ merged: ['IT'], added: 0 });
    });
});
