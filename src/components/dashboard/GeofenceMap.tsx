import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface SatellitePoint {
  lat: number;
  lng: number;
}

interface GeofenceMapProps {
  latitude: number;
  longitude: number;
  radius: number;
  satellitePoints?: SatellitePoint[];
  onPositionChange?: (lat: number, lng: number) => void;
  onSatellitePointsChange?: (points: SatellitePoint[]) => void;
}

function getZoomForRadius(meters: number): number {
  if (meters <= 100) return 16;
  if (meters <= 200) return 15;
  if (meters <= 500) return 14;
  if (meters <= 1000) return 13;
  return 12;
}

const SATELLITE_COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316", "#14B8A6"];

const GeofenceMap = ({
  latitude,
  longitude,
  radius,
  satellitePoints = [],
  onPositionChange,
  onSatellitePointsChange,
}: GeofenceMapProps) => {
  const mapRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const satelliteMarkersRef = useRef<any[]>([]);
  const satelliteCirclesRef = useRef<any[]>([]);

  const clearSatelliteMarkers = () => {
    for (const m of satelliteMarkersRef.current) m.remove();
    for (const c of satelliteCirclesRef.current) c.remove();
    satelliteMarkersRef.current = [];
    satelliteCirclesRef.current = [];
  };

  const addSatelliteMarkersToMap = (points: SatellitePoint[]) => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map) return;

    clearSatelliteMarkers();

    points.forEach((pt, idx) => {
      const color = SATELLITE_COLORS[idx % SATELLITE_COLORS.length];

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width: 20px; height: 20px; border-radius: 50%;
          background: ${color}; border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 10px; font-weight: bold;
        ">${idx + 1}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([pt.lat, pt.lng], { draggable: true, icon }).addTo(map);

      const circle = L.circle([pt.lat, pt.lng], {
        radius: 100,
        color: color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: "5,5",
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        const newLat = parseFloat(pos.lat.toFixed(7));
        const newLng = parseFloat(pos.lng.toFixed(7));
        circle.setLatLng([newLat, newLng]);
        const updated = [...points];
        updated[idx] = { lat: newLat, lng: newLng };
        onSatellitePointsChange?.(updated);
      });

      satelliteMarkersRef.current.push(marker);
      satelliteCirclesRef.current.push(circle);
    });
  };

  // Init map
  useEffect(() => {
    if (!latitude || !longitude) return;

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

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        circleRef.current = null;
        markerRef.current = null;
        clearSatelliteMarkers();
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

      // Main marker (red by default from Leaflet)
      markerRef.current = L.marker([latitude, longitude], {
        draggable: true,
      }).addTo(map);

      markerRef.current.on("dragend", () => {
        const pos = markerRef.current.getLatLng();
        const newLat = parseFloat(pos.lat.toFixed(7));
        const newLng = parseFloat(pos.lng.toFixed(7));
        circleRef.current.setLatLng([newLat, newLng]);
        onPositionChange?.(newLat, newLng);
      });

      map.fitBounds(circleRef.current.getBounds(), { padding: [30, 30] });

      // Add satellite markers
      addSatelliteMarkersToMap(satellitePoints);
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
        clearSatelliteMarkers();
      }
    };
  }, [latitude, longitude]);

  // Update radius
  useEffect(() => {
    if (!circleRef.current || !mapRef.current) return;
    circleRef.current.setRadius(radius);
    mapRef.current.fitBounds(circleRef.current.getBounds(), { padding: [30, 30] });
  }, [radius]);

  // Update satellite markers when points change externally
  useEffect(() => {
    if (mapRef.current) {
      addSatelliteMarkersToMap(satellitePoints);
    }
  }, [satellitePoints.length]);

  const handleAddPoint = () => {
    if (satellitePoints.length >= 9) return;
    // Place new point ~80m north of center
    const offsetLat = 80 / 111320;
    const angle = (satellitePoints.length * 90) * (Math.PI / 180);
    const newPoint: SatellitePoint = {
      lat: parseFloat((latitude + offsetLat * Math.cos(angle)).toFixed(7)),
      lng: parseFloat((longitude + (offsetLat * Math.sin(angle)) / Math.cos(latitude * Math.PI / 180)).toFixed(7)),
    };
    onSatellitePointsChange?.([...satellitePoints, newPoint]);
  };

  const handleRemovePoint = (idx: number) => {
    const updated = satellitePoints.filter((_, i) => i !== idx);
    onSatellitePointsChange?.(updated);
  };

  return (
    <div className="space-y-3">
      <div
        id="geofence-map"
        style={{
          height: "320px",
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      />
      <p className="text-[10px] text-muted-foreground text-center">
        📌 Glissez les marqueurs pour ajuster les positions
      </p>

      {/* Satellite points controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium flex items-center gap-1.5">
            📡 Points satellites <span className="text-muted-foreground">({satellitePoints.length}/9)</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px] rounded-lg gap-1"
            onClick={handleAddPoint}
            disabled={satellitePoints.length >= 9}
          >
            <Plus className="w-3 h-3" /> Ajouter
          </Button>
        </div>

        {satellitePoints.length === 0 && (
          <p className="text-[10px] text-muted-foreground">
            Ajoutez des points satellites pour étendre la zone de détection (~100m par point).
          </p>
        )}

        {satellitePoints.map((pt, idx) => (
          <div key={idx} className="flex items-center gap-2 text-[11px]">
            <span
              className="w-4 h-4 rounded-full shrink-0 border-2 border-white shadow-sm"
              style={{ background: SATELLITE_COLORS[idx % SATELLITE_COLORS.length] }}
            />
            <span className="font-mono text-muted-foreground flex-1">
              {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
            </span>
            <button
              type="button"
              onClick={() => handleRemovePoint(idx)}
              className="text-destructive/60 hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GeofenceMap;
