import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { ClipPath, Defs, RadialGradient, Rect, Stop, Circle, Path, G } from 'react-native-svg';
import { flatWorldMap, globeWorldMap } from '../utils/worldMap';
import { isoToFlag } from '../utils/countryFlags';

export type CountryMapStyle = 'flat' | 'globe';

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
    variant: CountryMapStyle;
    /** Full gold (normal card: every visited country; recap: the year's). */
    gold: readonly string[];
    /** Muted gold (recap: countries visited in other years). */
    dim?: readonly string[];
    /** Card design scale (render px per design px), for the "other side" line. */
    u?: number;
    /** "+{count} on the other side of the globe" (globe only), already localized. */
    hiddenLabel?: (count: number) => string;
    testID?: string;
}

/**
 * The user's real countries, as plain SVG (react-native-svg): a flat world map
 * or a globe turned towards the largest group of visited countries. Used by the
 * share card and the result page, never a WebView, never a capture of the 3D
 * globe. The SVG scales into whatever box it gets (viewBox + "meet").
 */
const CountryMap: React.FC<Props> = ({ variant, gold, dim = [], u = 1, hiddenLabel, testID }) => {
    const goldKey = gold.join(',');
    const dimKey = dim.join(',');
    const map = useMemo(
        () => (variant === 'globe' ? globeWorldMap({ gold, dim }) : flatWorldMap({ gold, dim })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [variant, goldKey, dimKey],
    );
    const hidden = map.hidden;
    const g = map.globe;
    return (
        <View style={styles.wrap} testID={testID}>
            <View style={styles.svgBox}>
                <Svg width="100%" height="100%" viewBox={`0 0 ${map.width} ${map.height}`} preserveAspectRatio="xMidYMid meet">
                    <Defs>
                        <RadialGradient id="atmo" cx="50%" cy="50%" r="50%">
                            <Stop offset="0.86" stopColor="#00d4ff" stopOpacity="0.22" />
                            <Stop offset="1" stopColor="#00d4ff" stopOpacity="0" />
                        </RadialGradient>
                        {/* Flat map: eastern Russia and Fiji are drawn on both edges, cut here */}
                        <ClipPath id="mapEdges">
                            <Rect x={0} y={0} width={map.width} height={map.height} />
                        </ClipPath>
                    </Defs>
                    {g ? <Circle cx={g.cx} cy={g.cy} r={g.r * 1.04} fill="url(#atmo)" /> : null}
                    {g ? <Circle cx={g.cx} cy={g.cy} r={g.r} fill={COLORS.ocean} stroke={COLORS.rim} strokeWidth={2.5} /> : null}
                    <G clipPath={g ? undefined : 'url(#mapEdges)'}>
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
                    </G>
                    {/* Real travel arcs (app-style red dashes) and the plane */}
                    {map.arcs.map((d, i) => (
                        <Path key={`arc${i}`} d={d} fill="none" stroke="rgba(239,68,68,0.8)" strokeWidth={3.5} strokeDasharray="12,9" strokeLinecap="round" />
                    ))}
                    {map.plane ? (
                        <G transform={`translate(${map.plane.x}, ${map.plane.y}) rotate(${map.plane.angle}) scale(2.6)`}>
                            <Path d={PLANE_PATH} fill="#EAF6FF" opacity={0.95} />
                        </G>
                    ) : null}
                </Svg>
            </View>
            {g && hidden.length > 0 && hiddenLabel ? (
                <Text
                    style={[styles.hidden, { fontSize: 30 * u, marginTop: 10 * u }]}
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
    hidden: { color: '#FDE68A', fontWeight: '700', textAlign: 'center' },
});

export default CountryMap;
