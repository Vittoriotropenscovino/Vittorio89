import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Trip } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icons
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Type hack for Leaflet icon prototype
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl.src || iconRetinaUrl,
    iconUrl: iconUrl.src || iconUrl,
    shadowUrl: shadowUrl.src || shadowUrl,
});

interface MapViewProps {
    trips: Trip[];
    onPinPress: (trip: Trip) => void;
    selectedTripId: string | null;
}

// Helper to center map
const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

const MapView: React.FC<MapViewProps> = ({ trips, onPinPress, selectedTripId }) => {
    const defaultCenter: [number, number] = [41.9028, 12.4964]; // Rome
    const zoom = 4;

    return (
        <View style={styles.container}>
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
                // @ts-ignore
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
