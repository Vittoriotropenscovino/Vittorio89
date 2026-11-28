import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 1.4.0 block K: the paywall changes ONLY in its layout (plan, point 11).
const ROOT = path.join(__dirname, '../../..');
const FILE = 'src/components/PaywallScreen.tsx';
const src = fs.readFileSync(path.join(ROOT, FILE), 'utf8');

// purchase/restore logic exactly as in 1.3.0
const block = (s: string, from: string, to: string) => s.slice(s.indexOf(from), s.indexOf(to, s.indexOf(from)));

describe('paywall: layout only', () => {
    it('purchase and restore logic are unchanged since before the vertical work', () => {
        let before = '';
        try {
            before = execSync(`git show 4ec2d98e:${FILE}`, { cwd: ROOT, encoding: 'utf8' });
        } catch {
            return; // no git history (e.g. a source zip): nothing to compare with
        }
        const norm = (s: string) => s.replace(/\r\n/g, '\n');
        expect(norm(block(src, 'const handlePurchase', 'const features'))).toBe(norm(block(before, 'const handlePurchase', 'const features')));
    });

    it('every paywall text is still there, untouched', () => {
        for (const key of ['paywallTitle', 'paywallSubtitle', 'paywallFeature1', 'paywallFeature2', 'paywallFeature3', 'paywallFeature4', 'paywallButton', 'paywallRestore', 'paywallSuccess']) {
            expect(src).toContain(`'${key}'`);
        }
        expect(src).toMatch(/String\(t\('paywallButton'\)\)\.replace\('\{0\}', price\)/);
        expect(src).toMatch(/String\(t\('paywallSubtitle'\)\)\.replace\('\{0\}', String\(freeLimit\)\)/);
    });

    it('the purchase button is outside the scroll, so it is always visible', () => {
        const scrollEnd = src.indexOf('</ScrollView>');
        expect(scrollEnd).toBeGreaterThan(0);
        expect(src.indexOf('testID="paywall-purchase"')).toBeGreaterThan(scrollEnd);
        expect(src.indexOf('testID="paywall-restore"')).toBeGreaterThan(scrollEnd);
    });

    it('stays inside the safe area, 92% wide in portrait', () => {
        expect(src).toMatch(/maxHeight = winH - insets\.top - insets\.bottom/);
        expect(src).toMatch(/cardPortrait: \{ width: '92%' \}/);
    });
});
