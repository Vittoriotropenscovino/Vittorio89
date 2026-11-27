import { keyboardOverlap } from '../keyboardOverlap';

describe('how much of the page the keyboard covers', () => {
    it('no keyboard, no overlap', () => {
        expect(keyboardOverlap(900, 0, 600)).toBe(0);
    });

    it('emulator: page as tall as the window, the height alone is right', () => {
        // keyboard top at 900 - 300 = 600
        expect(keyboardOverlap(900, 300, 600)).toBe(300);
    });

    it('Samsung S25: the page runs under the navigation bar, the reported height leaves it out', () => {
        // page 832 tall (screen), keyboard top at 480 on the screen, reported height 304:
        // the real overlap is 352, the height alone would leave "Save" 48 points under the keys
        expect(keyboardOverlap(832, 304, 480)).toBe(352);
    });

    it('without screenY (old platforms) it falls back to the height', () => {
        expect(keyboardOverlap(832, 304)).toBe(304);
        expect(keyboardOverlap(0, 304, 480)).toBe(304);
    });
});
