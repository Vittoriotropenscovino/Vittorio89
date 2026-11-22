// 1.4.0: the backgrounds of every window that opens over the main screen.
//
// In landscape the old windows were translucent and nobody noticed: behind them
// there was only the dark globe. In portrait the panel under the globe is full of
// bright gold and cyan buttons, and through a 70-85% background they read as
// ghost text inside Settings, Calendar, the trip form... (phone test 22/11).
// On Android expo-blur does not really blur (it only tints), so the colour of the
// window itself has to cover what is behind it.

/** Dimmed screen behind a centred window. */
export const MODAL_BACKDROP = 'rgba(2,3,10,0.86)';

/** The window itself: almost opaque, same dark blue-grey as before. */
export const MODAL_CARD = 'rgba(14,15,22,0.98)';

/** Full-screen sheets (trip viewer, share sheet). */
export const SHEET_BACKGROUND = 'rgba(3,3,10,0.97)';
