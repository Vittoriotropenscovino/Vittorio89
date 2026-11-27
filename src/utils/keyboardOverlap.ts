// How much of a full-screen page the keyboard covers, in points.
//
// The trip form is a Modal that does not shrink when the keyboard opens, so it moves
// its bottom up by this amount ("Add Pin" / "Save" stay in sight while typing).
//
// Using only the keyboard height was not enough on Vittorio's Samsung S25 (prova 3,
// 24/11/2026): the page also runs under the navigation bar, and the Samsung keyboard
// reports a height that leaves that part out, so the button stayed hidden. The
// keyboard's top edge on the screen (screenY) is compared with the real height of the
// page instead; the larger of the two answers wins.
export function keyboardOverlap(pageHeight: number, keyboardHeight: number, keyboardScreenY?: number): number {
    if (!(keyboardHeight > 0)) return 0;
    const byTop = keyboardScreenY !== undefined && keyboardScreenY > 0 && pageHeight > 0
        ? pageHeight - keyboardScreenY
        : 0;
    return Math.max(0, Math.round(Math.max(keyboardHeight, byTop)));
}
