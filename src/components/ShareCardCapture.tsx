import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
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

/**
 * Off-screen host for ShareCard + imperative capture().
 *
 * The card is mounted in the tree (so react-native-svg / the QR actually draw)
 * but parked behind the app's opaque root via a negative zIndex, so the user
 * never sees a "card screen" — they just receive the finished PNG. Capturing the
 * card's own ref (full opacity) avoids inheriting the host's hidden styling.
 */
const ShareCardCapture = forwardRef<ShareCardCaptureHandle, Props>(
    ({ stats, travelerName, renderWidth = 360 }, ref) => {
        const cardRef = useRef<View>(null);

        useImperativeHandle(
            ref,
            () => ({
                capture: async () => {
                    // Let the SVG globe + QR commit a frame before snapshotting.
                    await new Promise((resolve) => setTimeout(resolve, 80));
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
            <View style={styles.host} pointerEvents="none" collapsable={false}>
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
    // Within the render tree (drawable/capturable) but behind the opaque root,
    // so it stays invisible to the user.
    host: { position: 'absolute', top: 0, left: 0, zIndex: -1 },
});

export default ShareCardCapture;
