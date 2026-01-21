import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
// Separate imports for web to avoid native crashes
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, useMap: any;
let L: any;

if (Platform.OS === 'web') {
    const ReactLeaflet = require('react-leaflet');
    MapContainer = ReactLeaflet.MapContainer;
    TileLayer = ReactLeaflet.TileLayer;
    Marker = ReactLeaflet.Marker;
    Popup = ReactLeaflet.Popup;
    useMap = ReactLeaflet.useMap;
    L = require('leaflet');

    // Fix leaflet icons
    require('leaflet/dist/leaflet.css');
    const iconRetinaUrl = require('leaflet/dist/images/marker-icon-2x.png');
    const iconUrl = require('leaflet/dist/images/marker-icon.png');
    const shadowUrl = require('leaflet/dist/images/marker-shadow.png');

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl,
        iconUrl,
        shadowUrl,
    });
}

import { Trip } from '../types';

interface MapViewProps {
    trips: Trip[];
    onPinPress: (trip: Trip) => void;
    selectedTripId: string | null;
}

// Component to handle map center changes
const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

const MapView: React.FC<MapViewProps> = ({ trips, onPinPress, selectedTripId }) => {
    if (Platform.OS !== 'web') {
        return (
            <View style={styles.container}>
                {/* Fallback for native - could integrate react-native-maps later */}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    {/* Placeholder text */}
                </View>
            </View>
        );
    }

    const defaultCenter: [number, number] = [41.9028, 12.4964]; // Rome
    const zoom = 4;

    return (
        <View style={styles.container}>
            {/* Inject CSS style for leaflet container */}
            <style>
                {`
                    .leaflet-container {
                        width: 100%;
                        height: 100%;
                        background-color: #050510;
                    }
                `}
            </style>
            <MapContainer
                center={defaultCenter}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {trips.map((trip) => (
                    <Marker
                        key={trip.id}
                        position={[trip.latitude, trip.longitude]}
                        eventHandlers={{
                            click: () => onPinPress(trip),
                        }}
                    >
                        <Popup>
                            <strong>{trip.title}</strong><br />
                            {trip.locationName}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050510',
    },
});

export default MapView;
