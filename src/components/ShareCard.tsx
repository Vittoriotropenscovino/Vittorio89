import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
    Defs, LinearGradient, RadialGradient, Stop, Rect, Circle, Ellipse, G,
} from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { TravelStats } from '../utils/travelStats';

export const PLAY_STORE_URL =
    'https://play.google.com/store/apps/details?id=com.travelsphere.app';

// 9:16 story format. The card is designed in a 1080-wide coordinate space and
// scaled by `u = width / BASE_W`, so the SAME component renders crisp both in a
// small on-screen preview and when captured off-screen at full resolution.
const BASE_W = 1080;
const ASPECT = 16 / 9;

// Deterministic decorative star field (no Math.random → identical every capture).
// Positioned in the side margins / empty bands so stars never sit behind the
// title or the stat numbers.
const STARS: { x: number; y: number; r: number; o: number }[] = [
    { x: 55, y: 540, r: 2, o: 0.6 }, { x: 70, y: 1080, r: 2, o: 0.5 },
    { x: 48, y: 1480, r: 2, o: 0.5 }, { x: 1000, y: 300, r: 2, o: 0.5 },
    { x: 1015, y: 640, r: 3, o: 0.6 }, { x: 992, y: 1140, r: 2, o: 0.5 },
    { x: 1004, y: 1500, r: 2, o: 0.5 }, { x: 980, y: 150, r: 3, o: 0.6 },
    { x: 150, y: 1250, r: 2, o: 0.5 }, { x: 915, y: 1300, r: 2, o: 0.4 },
    { x: 120, y: 760, r: 2, o: 0.45 }, { x: 955, y: 860, r: 2, o: 0.45 },
];

interface ShareCardProps {
    stats: TravelStats;
    travelerName?: string;
    /** Rendered width in px. Height is derived (9:16). Default fits most phones. */
    width?: number;
}

const ShareCard = forwardRef<View, ShareCardProps>(
    ({ stats, travelerName, width = 360 }, ref) => {
        const W = width;
        const H = Math.round(width * ASPECT);
        const u = W / BASE_W; // design-px → render-px

        const globeCx = BASE_W / 2;
        const globeCy = 820;
        const globeR = 430;
        const qrSize = Math.round(168 * u);

        const name = travelerName?.trim();

        return (
            <View
                ref={ref}
                collapsable={false}
                style={[styles.card, { width: W, height: H }]}
            >
                {/* Background: deep-space gradient + stylized wireframe globe (SVG, no WebView) */}
                <Svg width={W} height={H} viewBox={`0 0 ${BASE_W} ${BASE_W * ASPECT}`} style={StyleSheet.absoluteFill}>
                    <Defs>
                        <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#0b0d18" />
                            <Stop offset="0.5" stopColor="#0e1a2e" />
                            <Stop offset="1" stopColor="#08080d" />
                        </LinearGradient>
                        <RadialGradient id="glow" cx="50%" cy={`${(globeCy / (BASE_W * ASPECT)) * 100}%`} r="55%">
                            <Stop offset="0" stopColor="#00d4ff" stopOpacity="0.22" />
                            <Stop offset="1" stopColor="#00d4ff" stopOpacity="0" />
                        </RadialGradient>
                    </Defs>

                    <Rect x="0" y="0" width={BASE_W} height={BASE_W * ASPECT} fill="url(#bg)" />
                    <Rect x="0" y="0" width={BASE_W} height={BASE_W * ASPECT} fill="url(#glow)" />

                    {STARS.map((s, i) => (
                        <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
                    ))}

                    {/* Wireframe sphere */}
                    <G opacity={0.5}>
                        <Circle cx={globeCx} cy={globeCy} r={globeR} stroke="#00d4ff" strokeWidth={2.5} fill="none" />
                        {/* latitudes */}
                        {[-0.66, -0.33, 0, 0.33, 0.66].map((f, i) => (
                            <Ellipse
                                key={`lat${i}`}
                                cx={globeCx}
                                cy={globeCy + globeR * f}
                                rx={globeR * Math.cos(Math.asin(f))}
                                ry={globeR * 0.12}
                                stroke="#00d4ff"
                                strokeWidth={1.5}
                                fill="none"
                                opacity={0.55}
                            />
                        ))}
                        {/* longitudes */}
                        {[1, 0.6, 0.25].map((rx, i) => (
                            <Ellipse
                                key={`lon${i}`}
                                cx={globeCx}
                                cy={globeCy}
                                rx={globeR * rx}
                                ry={globeR}
                                stroke="#00d4ff"
                                strokeWidth={1.5}
                                fill="none"
                                opacity={0.5}
                            />
                        ))}
                        <Ellipse cx={globeCx} cy={globeCy} rx={globeR} ry={globeR} stroke="#60A5FA" strokeWidth={1.5} fill="none" opacity={0.3} />
                    </G>
                </Svg>

                {/* Foreground content (RN text → reliable emoji + fonts) */}
                <View style={[styles.content, { padding: 70 * u }]}>
                    {/* Header */}
                    <View>
                        <View style={[styles.brandRow, { gap: 12 * u }]}>
                            <View style={[styles.brandDot, { width: 22 * u, height: 22 * u, borderRadius: 11 * u }]} />
                            <Text style={[styles.brand, { fontSize: 34 * u, letterSpacing: 2 * u }]}>TRAVELSPHERE</Text>
                        </View>
                        <Text style={[styles.title, { fontSize: 70 * u, lineHeight: 78 * u, marginTop: 26 * u }]}>
                            Il mio mondo{'\n'}su TravelSphere 🌍
                        </Text>
                        {name ? (
                            <Text style={[styles.traveler, { fontSize: 40 * u, marginTop: 18 * u }]}>
                                I viaggi di {name}
                            </Text>
                        ) : null}
                    </View>

                    {/* Stats */}
                    <View style={[styles.statsRow, { gap: 10 * u }]}>
                        <Stat value={stats.countries} label="Paesi" u={u} />
                        <Text style={[styles.statSep, { fontSize: 90 * u }]}>·</Text>
                        <Stat value={stats.continents} label="Continenti" u={u} />
                        <Text style={[styles.statSep, { fontSize: 90 * u }]}>·</Text>
                        <Stat value={stats.trips} label="Viaggi" u={u} />
                    </View>

                    {/* Footer: claim + QR to Play Store */}
                    <View style={[styles.footer, { borderRadius: 28 * u, padding: 32 * u }]}>
                        <View style={styles.footerText}>
                            <Text style={[styles.appName, { fontSize: 46 * u }]}>TravelSphere</Text>
                            <Text style={[styles.claim, { fontSize: 28 * u, lineHeight: 38 * u, marginTop: 8 * u }]}>
                                Diario di viaggio 3D{'\n'}Niente account · Solo Android
                            </Text>
                            <Text style={[styles.scan, { fontSize: 24 * u, marginTop: 14 * u }]}>
                                ↓ Inquadra per scaricare
                            </Text>
                        </View>
                        <View style={[styles.qrBox, { borderRadius: 18 * u, padding: 16 * u }]}>
                            <QRCode
                                value={PLAY_STORE_URL}
                                size={qrSize}
                                color="#08080d"
                                backgroundColor="#ffffff"
                                ecl="M"
                            />
                        </View>
                    </View>
                </View>
            </View>
        );
    }
);

ShareCard.displayName = 'ShareCard';

const Stat: React.FC<{ value: number; label: string; u: number }> = ({ value, label, u }) => (
    <View style={styles.stat}>
        <Text style={[styles.statValue, { fontSize: 128 * u }]}>{value}</Text>
        <Text style={[styles.statLabel, { fontSize: 32 * u, marginTop: 4 * u }]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    card: { overflow: 'hidden', backgroundColor: '#08080d' },
    content: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
    brandRow: { flexDirection: 'row', alignItems: 'center' },
    brandDot: { backgroundColor: '#00d4ff' },
    brand: { color: '#00d4ff', fontWeight: '800' },
    title: { color: '#FFFFFF', fontWeight: '800' },
    traveler: { color: '#9CA3AF', fontWeight: '600' },
    statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    stat: { alignItems: 'center', flexShrink: 1 },
    statValue: { color: '#00d4ff', fontWeight: '900' },
    statLabel: { color: '#C7CDD6', fontWeight: '600' },
    statSep: { color: '#3B4252', fontWeight: '300' },
    footer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
    },
    footerText: { flex: 1, paddingRight: 20 },
    appName: { color: '#FFFFFF', fontWeight: '800' },
    claim: { color: '#9CA3AF', fontWeight: '500' },
    scan: { color: '#00d4ff', fontWeight: '700' },
    qrBox: { backgroundColor: '#FFFFFF' },
});

export default ShareCard;
