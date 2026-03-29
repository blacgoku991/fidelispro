import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function MapUpdater({ lat, lng, radius }: { lat: number; lng: number; radius: number }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLng(lat, lng).toBounds(radius * 2.5);
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 17 });
  }, [lat, lng, radius, map]);
  return null;
}

interface GeofenceMapProps {
  latitude: number;
  longitude: number;
  radius: number;
}

const GeofenceMap = ({ latitude, longitude, radius }: GeofenceMapProps) => {
  return (
    <div className="rounded-xl overflow-hidden border border-border/50 h-[250px]">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} />
        <Circle
          center={[latitude, longitude]}
          radius={radius}
          pathOptions={{
            color: "#eab308",
            fillColor: "#eab308",
            fillOpacity: 0.18,
            weight: 2,
          }}
        />
        <MapUpdater lat={latitude} lng={longitude} radius={radius} />
      </MapContainer>
    </div>
  );
};

export default GeofenceMap;
