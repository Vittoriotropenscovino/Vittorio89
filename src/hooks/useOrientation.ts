import { ModalProps, useWindowDimensions } from 'react-native';

// 1.4.0: portrait is the main mode, turning the phone gives the landscape layout.
// Every screen decides its layout from the CURRENT window size (never from a size
// read once at startup), through this one check.
export function useOrientation() {
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    return { width, height, isLandscape, isPortrait: !isLandscape };
}

// Every Modal declares both orientations. Android ignores it, but on iPhone a
// Modal without it stays in portrait only (needed for iOS, see docs/ELENCO_IOS.md).
export const ALL_ORIENTATIONS: ModalProps['supportedOrientations'] = ['portrait', 'landscape'];
