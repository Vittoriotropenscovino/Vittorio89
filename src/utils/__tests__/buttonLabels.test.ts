import fs from 'fs';
import path from 'path';

// 1.4.0 rule: every button has a WRITTEN label (a <Text> inside it). This test
// finds every TouchableOpacity / Pressable without one.
//
// LABEL_DEBT is how many such buttons each file still has: it only goes DOWN,
// one screen at a time (docs/PIANO_1.4.0_VERTICALE.md). A new button without a
// label makes the count go up and fails; fixing one without lowering the number
// fails too, so the list always tells the truth.
//
// Some will stay on purpose, written in PERMANENT next to the file: the month
// arrows ‹ ›, tapping a photo or a thumbnail, the dark backdrop that closes a
// panel, the small ✕ that clears a search field.
const LABEL_DEBT: Record<string, number> = {
    'App.tsx': 1, // the ≡ Menu button (decided with the side menu, block C)
    'src/components/CalendarView.tsx': 3,
    'src/components/CountryPickerScreen.tsx': 1, // PERMANENT: ✕ that clears the search
    'src/components/HelpGuide.tsx': 1,
    'src/components/ItineraryManager.tsx': 4,
    'src/components/MemoryViewer.tsx': 6,
    'src/components/OnboardingScreen.tsx': 1,
    'src/components/PaywallScreen.tsx': 1,
    'src/components/PhotoFullscreen.tsx': 2,
    'src/components/PinSelector.tsx': 1,
    'src/components/PrivacyPolicy.tsx': 1,
    'src/components/SettingsScreen.tsx': 3,
    'src/components/StatsScreen.tsx': 1,
    'src/components/TermsOfService.tsx': 1,
    'src/components/TripForm.tsx': 7,
    'src/components/TripSidebar.tsx': 5,
};

const ROOT = path.join(__dirname, '../../..');
const BUTTON = /<(TouchableOpacity|Pressable|TouchableHighlight|TouchableWithoutFeedback)\b/g;

// end of a JSX opening tag, skipping {...} expressions
function tagEnd(src: string, from: number): number {
    let depth = 0;
    for (let i = from; i < src.length; i++) {
        const c = src[i];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0) return i;
    }
    return src.length;
}

export function buttonsWithoutLabel(src: string): number[] {
    const lines: number[] = [];
    let m: RegExpExecArray | null;
    BUTTON.lastIndex = 0;
    while ((m = BUTTON.exec(src))) {
        const tag = m[1];
        const end = tagEnd(src, m.index + 1);
        const line = src.slice(0, m.index).split('\n').length;
        if (src[end - 1] === '/') { lines.push(line); continue; }
        const inner = new RegExp(`<${tag}\b|</${tag}>`, 'g');
        inner.lastIndex = end + 1;
        let depth = 1, k: RegExpExecArray | null, close = src.length;
        while ((k = inner.exec(src))) {
            if (k[0].startsWith('</')) { if (--depth === 0) { close = k.index; break; } }
            else if (src[tagEnd(src, k.index + 1) - 1] !== '/') depth++;
        }
        if (!/<Text\b/.test(src.slice(end + 1, close))) lines.push(line);
    }
    return lines;
}

const files = ['App.tsx', ...fs.readdirSync(path.join(ROOT, 'src/components'))
    .filter((f) => f.endsWith('.tsx')).map((f) => `src/components/${f}`)];

describe('every button has a written label', () => {
    it('the scanner finds a button with only an icon, and accepts one with text', () => {
        expect(buttonsWithoutLabel('<TouchableOpacity onPress={a}><Ionicons name="x" /></TouchableOpacity>')).toEqual([1]);
        expect(buttonsWithoutLabel('<TouchableOpacity onPress={a}>\n<Ionicons name="x" />\n<Text>Chiudi</Text>\n</TouchableOpacity>')).toEqual([]);
        expect(buttonsWithoutLabel('<Pressable style={s} onPress={() => { f(); }} />')).toEqual([1]);
        // nested buttons are judged one by one: the outer one has text, the inner one does not
        expect(buttonsWithoutLabel('<Pressable><Text>a</Text><Pressable><Icon /></Pressable></Pressable>')).toEqual([1]);
    });

    it.each(files)('%s has exactly the buttons without label written in LABEL_DEBT', (file) => {
        const found = buttonsWithoutLabel(fs.readFileSync(path.join(ROOT, file), 'utf8'));
        const allowed = LABEL_DEBT[file] ?? 0;
        expect({ file, withoutLabel: found.length, lines: found }).toEqual({ file, withoutLabel: allowed, lines: found });
    });
});
