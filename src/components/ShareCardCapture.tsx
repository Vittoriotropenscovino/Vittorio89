import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import ShareCard from './ShareCard';
import { TravelStats } from '../utils/travelStats';

export interface ShareCardCaptureHandle {
    /** Render → PNG. Resolves with a file:// uri of a 1080×1920 temp file. */
    capture: () => Promise<string>;
}

interface Props {
    stats: TravelStats;
    travelerName?: string;
    /**
     * On-screen render width (points). Default 360 → on a 3x device the native
     * buffer is already 1080px, so the capture is pixel-perfect with no upscale.
     */
    renderWidth?: number;
}

// Fixed story output, independent of device density.
const OUTPUT = { width: 1080, height: 1920 };

const waitFrames = (n: number): Promise<void> =>
    new Promise((resolve) => {
        const tick = (left: number) =>
            left <= 0 ? resolve() : requestAnimationFrame(() => tick(left - 1));
        tick(n);
    });

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Off-screen host for ShareCard + imperative capture().
 *
 * The card is mounted in the tree (so react-native-svg / the QR actually draw)
 * but parked far off-screen, so the user never sees a "card screen" — they just
 * receive the finished PNG. Off-screen positioning rather than z-ordering: the
 * host is rendered inside translucent overlays, which a negative zIndex cannot
 * hide behind.
 *
 * Capturing too early is THE classic failure (blank/cropped PNG). We guard it:
 *   1) wait until the card has reported a real layout (onLayout, width > 0),
 *   2) wait a few painted frames so the SVG globe + QR are committed,
 *   3) then snapshot the card's own ref (full opacity).
 */
const ShareCardCapture = forwardRef<ShareCardCaptureHandle, Props>(
    ({ stats, travelerName, renderWidth = 360 }, ref) => {
        const cardRef = useRef<View>(null);
        const laidOut = useRef(false);

        const onLayout = (e: LayoutChangeEvent) => {
            if (e.nativeEvent.layout.width > 0 && e.nativeEvent.layout.height > 0) {
                laidOut.current = true;
            }
        };

        useImperativeHandle(
            ref,
            () => ({
                capture: async () => {
                    // 1) ensure the card has been measured (poll up to ~3s)
                    let waited = 0;
                    while (!laidOut.current && waited < 3000) {
                        await delay(50);
                        waited += 50;
                    }
                    // 2) let the SVG globe + QR paint a few frames, plus a margin
                    await waitFrames(3);
                    await delay(60);
                    // 3) snapshot
                    return captureRef(cardRef, {
                        format: 'png',
                        quality: 1,
                        result: 'tmpfile',
                        width: OUTPUT.width,
                        height: OUTPUT.height,
                    });
                },
            }),
            []
        );

        return (
            <View style={styles.host} pointerEvents="none" collapsable={false} onLayout={onLayout}>
                <ShareCard
                    ref={cardRef}
                    stats={stats}
                    travelerName={travelerName}
                    width={renderWidth}
                />
            </View>
        );
    }
);

ShareCardCapture.displayName = 'ShareCardCapture';

const styles = StyleSheet.create({
    // Parked far off-screen: mounted and laid out (so react-native-svg and the QR
    // actually draw, and captureRef can snapshot it) but never visible.
    //
    // NOT zIndex: -1 — that only hides the card behind whatever is painted on top
    // of it, and StatsScreen's overlay is rgba(0,0,0,0.7), i.e. translucent. In
    // landscape the card showed through as ghost text over the stats panel.
    host: { position: 'absolute', top: 0, left: -10000 },
});

export default ShareCardCapture;
