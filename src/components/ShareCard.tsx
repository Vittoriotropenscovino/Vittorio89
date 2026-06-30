import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
    Defs, LinearGradient, RadialGradient, Stop, Rect, Circle, Ellipse, Path, G,
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

const GLOBE = { cx: 540, cy: 820, r: 430 };

// Deterministic decorative star field, kept in the side margins / empty bands so
// stars never sit behind the title or the stat numbers.
const STARS: { x: number; y: number; r: number; o: number }[] = [
    { x: 55, y: 540, r: 2, o: 0.6 }, { x: 70, y: 1080, r: 2, o: 0.5 },
    { x: 48, y: 1480, r: 2, o: 0.5 }, { x: 1000, y: 300, r: 2, o: 0.5 },
    { x: 1015, y: 640, r: 3, o: 0.6 }, { x: 992, y: 1140, r: 2, o: 0.5 },
    { x: 1004, y: 1500, r: 2, o: 0.5 }, { x: 980, y: 150, r: 3, o: 0.6 },
    { x: 150, y: 1250, r: 2, o: 0.5 }, { x: 915, y: 1300, r: 2, o: 0.4 },
    { x: 120, y: 760, r: 2, o: 0.45 }, { x: 955, y: 860, r: 2, o: 0.45 },
];

// PURELY DECORATIVE brand pins — NOT real coordinates. Placed on the visible
// upper/lower bands of the globe so they never overlap the central stat panel.
// Style mirrors the app's trip pins (#EF4444 with a soft glow halo).
const PINS: { x: number; y: number }[] = [
    { x: 330, y: 660 }, { x: 700, y: 600 }, { x: 560, y: 470 },
    { x: 770, y: 690 }, { x: 470, y: 1150 }, { x: 665, y: 1175 },
];

// One ambient travel arc between two of the pins, with a small plane along it.
// Mirrors the app's red dashed arcs (rgba(239,68,68,...)).
const ARC = { x0: 330, y0: 660, cx: 515, cy: 420, x1: 700, y1: 600 };
// Quadratic-Bézier midpoint (t=0.5) and tangent → plane position + rotation.
const PLANE_X = 0.25 * ARC.x0 + 0.5 * ARC.cx + 0.25 * ARC.x1;
const PLANE_Y = 0.25 * ARC.y0 + 0.5 * ARC.cy + 0.25 * ARC.y1;
const PLANE_ROT =
    (Math.atan2(ARC.y1 - ARC.y0, ARC.x1 - ARC.x0) * 180) / Math.PI + 90;
// Top-view plane silhouette (points up by default).
const PLANE_PATH =
    'M0,-9 C1,-9 1.8,-7 1.8,-4.5 L8,-0.5 L8,1 L1.8,-0.7 L1.8,4 L3.4,5.6 L3.4,6.6 ' +
    'L0,5.4 L-3.4,6.6 L-3.4,5.6 L-1.8,4 L-1.8,-0.7 L-8,1 L-8,-0.5 L-1.8,-4.5 ' +
    'C-1.8,-7 -1,-9 0,-9 Z';

const travelerBadge = (countries: number): string => {
    if (countries === 0) return 'Il viaggio sta per iniziare ✈️';
    if (countries <= 3) return "Solo l'inizio del viaggio ✈️";
    if (countries <= 9) return 'Esploratore in crescita 🌍';
    if (countries <= 24) return 'Viaggiatore esperto 🧭';
    if (countries <= 49) return 'Esploratore seriale 🌍';
    return 'Cittadino del mondo 🌐';
};

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

        const qrSize = Math.round(168 * u);
        const name = travelerName?.trim();
        const badge = travelerBadge(stats.countries);

        // % of the world (195 sovereign countries). >0 but rounds to 0 → "<1".
        const worldPct = Math.round((stats.countries / 195) * 100);
        const showPct = stats.trips > 0;
        const pctText = worldPct === 0 ? '<1' : String(worldPct);

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
                        <RadialGradient id="glow" cx="50%" cy={`${(GLOBE.cy / (BASE_W * ASPECT)) * 100}%`} r="55%">
                            <Stop offset="0" stopColor="#00d4ff" stopOpacity="0.2" />
                            <Stop offset="1" stopColor="#00d4ff" stopOpacity="0" />
                        </RadialGradient>
                    </Defs>

                    <Rect x="0" y="0" width={BASE_W} height={BASE_W * ASPECT} fill="url(#bg)" />
                    <Rect x="0" y="0" width={BASE_W} height={BASE_W * ASPECT} fill="url(#glow)" />

                    {STARS.map((s, i) => (
                        <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
                    ))}

                    {/* Wireframe sphere (slightly dimmed so the stat panel stays crisp) */}
                    <G opacity={0.38}>
                        <Circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} stroke="#00d4ff" strokeWidth={2.5} fill="none" />
                        {[-0.66, -0.33, 0, 0.33, 0.66].map((f, i) => (
                            <Ellipse
                                key={`lat${i}`}
                                cx={GLOBE.cx}
                                cy={GLOBE.cy + GLOBE.r * f}
                                rx={GLOBE.r * Math.cos(Math.asin(f))}
                                ry={GLOBE.r * 0.12}
                                stroke="#00d4ff" strokeWidth={1.5} fill="none" opacity={0.55}
                            />
                        ))}
                        {[1, 0.6, 0.25].map((rx, i) => (
                            <Ellipse
                                key={`lon${i}`}
                                cx={GLOBE.cx} cy={GLOBE.cy} rx={GLOBE.r * rx} ry={GLOBE.r}
                                stroke="#00d4ff" strokeWidth={1.5} fill="none" opacity={0.5}
                            />
                        ))}
                        <Ellipse cx={GLOBE.cx} cy={GLOBE.cy} rx={GLOBE.r} ry={GLOBE.r} stroke="#60A5FA" strokeWidth={1.5} fill="none" opacity={0.3} />
                    </G>

                    {/* Ambient travel arc + plane (decorative, app-style red dashed) */}
                    <Path
                        d={`M${ARC.x0},${ARC.y0} Q${ARC.cx},${ARC.cy} ${ARC.x1},${ARC.y1}`}
                        stroke="rgba(239,68,68,0.7)" strokeWidth={3} fill="none"
                        strokeDasharray="12,9" strokeLinecap="round"
                    />
                    <G transform={`translate(${PLANE_X}, ${PLANE_Y}) rotate(${PLANE_ROT}) scale(2.3)`}>
                        <Path d={PLANE_PATH} fill="#EAF6FF" opacity={0.92} />
                    </G>

                    {/* Decorative brand pins (#EF4444 + glow halo) */}
                    {PINS.map((p, i) => (
                        <G key={`pin${i}`}>
                            <Circle cx={p.x} cy={p.y} r={20} fill="#EF4444" opacity={0.18} />
                            <Circle cx={p.x} cy={p.y} r={9} fill="#EF4444" />
                            <Circle cx={p.x - 2.5} cy={p.y - 2.5} r={2.5} fill="#FFE3E3" opacity={0.9} />
                        </G>
                    ))}
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

                    {/* Stats panel (translucent dark = readability over the globe) */}
                    <View style={[styles.panel, { borderRadius: 40 * u, paddingVertical: 40 * u, paddingHorizontal: 36 * u, gap: 20 * u }]}>
                        <View style={[styles.badge, { borderRadius: 999, paddingVertical: 12 * u, paddingHorizontal: 28 * u }]}>
                            <Text style={[styles.badgeText, { fontSize: 34 * u }]}>{badge}</Text>
                        </View>

                        <View style={[styles.statsRow, { gap: 10 * u }]}>
                            <Stat value={stats.countries} label="Paesi" u={u} />
                            <Text style={[styles.statSep, { fontSize: 84 * u }]}>·</Text>
                            <Stat value={stats.continents} label="Continenti" u={u} />
                            <Text style={[styles.statSep, { fontSize: 84 * u }]}>·</Text>
                            <Stat value={stats.trips} label="Viaggi" u={u} />
                        </View>

                        {showPct ? (
                            <Text style={[styles.pctLine, { fontSize: 40 * u }]}>
                                Hai visto il <Text style={styles.pctNum}>{pctText}%</Text> del mondo 🌍
                            </Text>
                        ) : null}
                    </View>

                    {/* Challenge + footer (claim + QR to Play Store) */}
                    <View style={{ gap: 28 * u }}>
                        <Text style={[styles.challenge, { fontSize: 40 * u }]}>
                            E tu, quanti ne hai visti? 🌍
                        </Text>
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
            </View>
        );
    }
);

ShareCard.displayName = 'ShareCard';

const Stat: React.FC<{ value: number; label: string; u: number }> = ({ value, label, u }) => (
    <View style={styles.stat}>
        <Text style={[styles.statValue, { fontSize: 120 * u }]}>{value}</Text>
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
    panel: {
        backgroundColor: 'rgba(9,11,20,0.62)',
        borderWidth: 1, borderColor: 'rgba(0,212,255,0.22)',
        alignItems: 'center',
    },
    badge: {
        backgroundColor: 'rgba(0,212,255,0.14)',
        borderWidth: 1, borderColor: 'rgba(0,212,255,0.45)',
    },
    badgeText: { color: '#7FE8FF', fontWeight: '800' },
    statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    stat: { alignItems: 'center', flexShrink: 1 },
    statValue: { color: '#00d4ff', fontWeight: '900' },
    statLabel: { color: '#C7CDD6', fontWeight: '600' },
    statSep: { color: '#3B4252', fontWeight: '300' },
    pctLine: { color: '#E5EEFF', fontWeight: '700', textAlign: 'center' },
    pctNum: { color: '#00d4ff', fontWeight: '900' },
    challenge: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' },
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
