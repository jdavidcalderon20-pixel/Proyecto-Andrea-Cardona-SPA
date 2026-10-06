import React from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '450px',
  borderRadius: '16px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
};

// Custom Silver/Gold style for the map
const mapOptions = {
  styles: [
    { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
    { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
    { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
    { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
    { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
    { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
    { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
  ],
  disableDefaultUI: true,
  zoomControl: true,
};

const GoogleMapsSection = ({ address, height = '450px', borderRadius = '16px', customCenter = null }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  // Default center (Chinchiná, Caldas, Colombia)
  const center = customCenter || {
    lat: 4.9823,
    lng: -75.6033
  };

  const dynamicContainerStyle = {
    width: '100%',
    height: height,
    borderRadius: borderRadius,
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
  };

  return isLoaded ? (
    <div style={{ width: '100%' }}>
      <GoogleMap
        mapContainerStyle={dynamicContainerStyle}
        center={center}
        zoom={16}
        options={mapOptions}
      >
        <Marker 
          position={center} 
          title="Andrea Cardona SPA"
        />
      </GoogleMap>
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || 'Andrea Cardona SPA Chinchiná')}`}
          target="_blank" 
          rel="noreferrer"
          style={{ color: '#C5A059', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}
        >
          ¿Cómo llegar? Abrir en Google Maps
        </a>
      </div>
    </div>
  ) : <div style={{ height: height, backgroundColor: '#f3f4f6', borderRadius: borderRadius, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando Mapa...</div>;
};

export default React.memo(GoogleMapsSection);
