import { useEffect, useRef } from "react";

interface GeofenceMapProps {
  latitude: number;
  longitude: number;
  radius: number;
}

function getZoomForRadius(meters: number): number {
  if (meters <= 100) return 16;
  if (meters <= 200) return 15;
  if (meters <= 500) return 14;
  if (meters <= 1000) return 13;
  return 12;
}

const GeofenceMap = ({ latitude, longitude, radius }: GeofenceMapProps) => {
  const mapRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const initializedRef = useRef(false);

  // Init map
  useEffect(() => {
    if (!latitude || !longitude) return;

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      const L = (window as any).L;
      if (!L) return;

      const container = document.getElementById("geofence-map");
      if (!container) return;

      // Destroy previous instance
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        circleRef.current = null;
        markerRef.current = null;
      }

      const map = L.map("geofence-map", {
        center: [latitude, longitude],
        zoom: getZoomForRadius(radius),
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      mapRef.current = map;

      circleRef.current = L.circle([latitude, longitude], {
        radius: radius,
        color: "#EAB308",
        fillColor: "#FEF9C3",
        fillOpacity: 0.35,
        weight: 2,
      }).addTo(map);

      markerRef.current = L.marker([latitude, longitude]).addTo(map);

      // Fit to circle bounds
      map.fitBounds(circleRef.current.getBounds(), { padding: [30, 30] });
      initializedRef.current = true;
    };

    if ((window as any).L) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        circleRef.current = null;
        markerRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [latitude, longitude]);

  // Update radius when slider changes
  useEffect(() => {
    if (!circleRef.current || !mapRef.current) return;
    circleRef.current.setRadius(radius);
    mapRef.current.fitBounds(circleRef.current.getBounds(), { padding: [30, 30] });
  }, [radius]);

  return (
    <div
      id="geofence-map"
      style={{
        height: "320px",
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    />
  );
};

export default GeofenceMap;
