
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Memory } from '../types/memory';

interface MapProps {
  memories: Memory[];
  selectedMemory: Memory | null;
  onSelectMemory: (memory: Memory) => void;
  mapApiKey?: string;
}

const Map: React.FC<MapProps> = ({ 
  memories, 
  selectedMemory, 
  onSelectMemory,
  mapApiKey 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{[key: string]: L.Marker}>({});

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!mapRef.current) {
      // Initialize with a more dramatic tilt/angle for an immersive look
      mapRef.current = L.map(mapContainer.current, {
        zoomControl: false,
        attributionControl: false,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
      }).setView([28, 7], 2);

      // Use a nicer map style - we can offer different style options
      const mapStyle = localStorage.getItem('map-style') || 'standard';
      
      if (mapStyle === 'dark') {
        // Dark mode map
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }).addTo(mapRef.current);
      } else if (mapStyle === 'satellite') {
        // Satellite view
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxZoom: 19,
        }).addTo(mapRef.current);
      } else {
        // Standard light map with minimal styling
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      // Removed zoom control and scale to meet user's requirements
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Create and manage markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => {
      marker.remove();
    });
    markersRef.current = {};

    // Add markers for each memory with improved Instagram-like appearance
    memories.forEach(memory => {
      const { lat, lng } = memory.location;
      
      // Create custom marker element with thumbnail if available
      const markerElement = document.createElement('div');
      markerElement.className = 'mapbox-marker';
      
      if (memory.thumbnail || (memory.media && memory.media.length > 0)) {
        const thumbnailUrl = memory.thumbnail || memory.media?.[0]?.url;
        markerElement.innerHTML = `
          <div class="marker-thumbnail" style="background-image: url('${thumbnailUrl}')">
            <span class="marker-letter">${memory.place.charAt(0).toUpperCase()}</span>
          </div>
        `;
      } else {
        markerElement.innerHTML = `<span class="marker-letter">${memory.place.charAt(0).toUpperCase()}</span>`;
      }
      
      // Add animation state classes if this is the selected memory
      if (selectedMemory && selectedMemory.id === memory.id) {
        markerElement.classList.add('ring-4', 'ring-white', 'ring-opacity-70');
      }
      
      // Create marker and add to map with custom animation
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          html: markerElement,
          className: 'custom-marker',
          iconSize: [40, 40]
        }),
        riseOnHover: true,
        riseOffset: 250
      }).addTo(mapRef.current!);
      
      // Add click event with enhanced visual feedback
      marker.on('click', () => {
        markerElement.classList.add('marker-pulse');
        setTimeout(() => {
          markerElement.classList.remove('marker-pulse');
          onSelectMemory(memory);
        }, 300);
      });
      
      // Add hover effect
      marker.on('mouseover', () => {
        markerElement.classList.add('scale-110');
        markerElement.style.boxShadow = '0 0 20px rgba(0, 123, 255, 0.6)';
      });
      
      marker.on('mouseout', () => {
        markerElement.classList.remove('scale-110');
        markerElement.style.boxShadow = '';
      });
      
      // Store marker reference
      markersRef.current[memory.id] = marker;
    });
  }, [memories, selectedMemory, onSelectMemory]);

  // Pan to selected memory with smoother animation
  useEffect(() => {
    if (selectedMemory && mapRef.current) {
      const { lat, lng } = selectedMemory.location;
      mapRef.current.flyTo([lat, lng], 10, {
        duration: 1.5,
        easeLinearity: 0.5
      });
      
      // Highlight the marker
      const marker = markersRef.current[selectedMemory.id];
      if (marker) {
        const element = marker.getElement();
        if (element) {
          element.classList.add('pulse');
          setTimeout(() => {
            element.classList.remove('pulse');
          }, 2000);
        }
      }
    }
  }, [selectedMemory]);

  return (
    <div className="h-full w-full relative">
      <div ref={mapContainer} className="h-full w-full" />
      {/* Optional overlay gradient for better visibility of UI elements */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 to-transparent z-[5]"></div>
    </div>
  );
};

export default Map;
