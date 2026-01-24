import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trip } from '../types';

interface MapViewProps {
    trips: Trip[];
    onPinPress: (trip: Trip) => void;
    selectedTripId: string | null;
}

// Native version of MapView - Leaflet is WEB ONLY
// Using Leaflet on native causes immediate crashes even with Platform.OS checks
// because imports are evaluated at startup.
const MapView: React.FC<MapViewProps> = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Mappa non disponibile su mobile</Text>
            <Text style={styles.subtext}>Usa la visualizzazione Globo 3D</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050510',
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    subtext: {
        color: '#9CA3AF',
        marginTop: 8,
    }
});

export default MapView;
