import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle, Path, G } from 'react-native-svg';
import { globeWorldMap } from '../utils/worldMap';
import { isoToFlag } from '../utils/countryFlags';

// Gold = visited (same accent as the "visited" screens); the rest dark blue.
const COLORS = {
    land: '#1E3A5F',
    border: '#0B1424',
    gold: '#FBBF24',
    goldGlow: '#FBBF24',
    dim: '#8C6A1C',
    ocean: '#0A1A30',
    rim: 'rgba(0,212,255,0.45)',
};

// Top-view plane silhouette (points up), the same one the card had before.
const PLANE_PATH =
    'M0,-9 C1,-9 1.8,-7 1.8,-4.5 L8,-0.5 L8,1 L1.8,-0.7 L1.8,4 L3.4,5.6 L3.4,6.6 ' +
    'L0,5.4 L-3.4,6.6 L-3.4,5.6 L-1.8,4 L-1.8,-0.7 L-8,1 L-8,-0.5 L-1.8,-4.5 ' +
    'C-1.8,-7 -1,-9 0,-9 Z';

interface Props {
    /** Full gold (normal card: every visited country; recap: the year's). */
    gold: readonly string[];
    /** Muted gold (recap: countries visited in other years). */
    dim?: readonly string[];
    /** Font size of the "other side of the globe" line (render px). */
    hiddenFontSize?: number;
    /** "+{count} on the other side of the globe", already localized. */
    hiddenLabel?: (count: number) => string;
    testID?: string;
}

/**
 * The user's real countries on a globe turned towards the largest group of
 * visited countries, as plain SVG (react-native-svg). Used by the share card
 * and the result page: never a WebView, never a capture of the 3D globe. The
 * SVG scales into whatever box it gets (viewBox + "meet"). Visited countries
 * left on the hidden side are listed underneath, with their flags.
 */
const CountryMap: React.FC<Props> = ({ gold, dim = [], hiddenFontSize = 16, hiddenLabel, testID }) => {
    const goldKey = gold.join(',');
    const dimKey = dim.join(',');
    const map = useMemo(
        () => globeWorldMap({ gold, dim }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [goldKey, dimKey],
    );
    const { hidden, globe: g } = map;
    return (
        <View style={styles.wrap} testID={testID}>
            <View style={styles.svgBox}>
                <Svg width="100%" height="100%" viewBox={`0 0 ${map.width} ${map.height}`} preserveAspectRatio="xMidYMid meet">
                    <Defs>
                        <RadialGradient id="atmo" cx="50%" cy="50%" r="50%">
                            <Stop offset="0.86" stopColor="#00d4ff" stopOpacity="0.22" />
                            <Stop offset="1" stopColor="#00d4ff" stopOpacity="0" />
                        </RadialGradient>
                    </Defs>
                    <Circle cx={g.cx} cy={g.cy} r={g.r * 1.04} fill="url(#atmo)" />
                    <Circle cx={g.cx} cy={g.cy} r={g.r} fill={COLORS.ocean} stroke={COLORS.rim} strokeWidth={2.5} />
                    <Path d={map.land} fill={COLORS.land} stroke={COLORS.border} strokeWidth={1} strokeLinejoin="round" />
                    {map.dim ? <Path d={map.dim} fill={COLORS.dim} stroke={COLORS.border} strokeWidth={1} strokeLinejoin="round" /> : null}
                    {map.gold ? (
                        <G>
                            <Path d={map.gold} fill="none" stroke={COLORS.goldGlow} strokeOpacity={0.28} strokeWidth={9} strokeLinejoin="round" />
                            <Path d={map.gold} fill={COLORS.gold} stroke="#B7791F" strokeWidth={1} strokeLinejoin="round" />
                        </G>
                    ) : null}
                    {map.dots.map((d, i) => (
                        <G key={i}>
                            <Circle cx={d.x} cy={d.y} r={d.tone === 'gold' ? 17 : 12} fill={d.tone === 'gold' ? COLORS.gold : COLORS.dim} opacity={0.3} />
                            <Circle cx={d.x} cy={d.y} r={d.tone === 'gold' ? 7.5 : 6} fill={d.tone === 'gold' ? COLORS.gold : COLORS.dim} stroke={COLORS.border} strokeWidth={1.5} />
                        </G>
                    ))}
                    {/* Real travel arcs (thin app-style red dashes, at most 4) and one plane */}
                    {map.arcs.map((d, i) => (
                        <Path key={`arc${i}`} d={d} fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth={2.2} strokeDasharray="9,8" strokeLinecap="round" />
                    ))}
                    {map.plane ? (
                        <G transform={`translate(${map.plane.x}, ${map.plane.y}) rotate(${map.plane.angle}) scale(2.3)`}>
                            <Path d={PLANE_PATH} fill="#EAF6FF" opacity={0.95} />
                        </G>
                    ) : null}
                </Svg>
            </View>
            {hidden.length > 0 && hiddenLabel ? (
                <Text
                    style={[styles.hidden, { fontSize: hiddenFontSize, marginTop: hiddenFontSize * 0.3 }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                    testID="country-map-hidden"
                >
                    {`${hidden.slice(0, 6).map(isoToFlag).join(' ')}  ${hiddenLabel(hidden.length)}`}
                </Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { flex: 1, alignSelf: 'stretch', alignItems: 'center' },
    svgBox: { flex: 1, alignSelf: 'stretch' },
    // flexShrink 0: the globe must never squeeze this line (it would shrink to fit).
    hidden: { color: '#FDE68A', fontWeight: '700', textAlign: 'center', flexShrink: 0 },
});

export default CountryMap;
