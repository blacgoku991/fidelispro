import { useMemo } from "react";

interface GeofenceMapProps {
  latitude: number;
  longitude: number;
  radius: number;
}

const GeofenceMap = ({ latitude, longitude, radius }: GeofenceMapProps) => {
  const mapUrl = useMemo(() => {
    const cosLat = Math.cos((latitude * Math.PI) / 180);
    // Calculate zoom so the circle fits nicely
    const desiredCircleFraction = 0.35;
    const mapWidthPx = 600;
    const desiredCirclePx = mapWidthPx * desiredCircleFraction;
    const zoom = Math.min(18, Math.max(12, Math.round(
      Math.log2((156543.03 * cosLat * desiredCirclePx) / (radius * 2))
    )));

    const metersPerPx = (156543.03 * cosLat) / Math.pow(2, zoom);
    const halfWidthDeg = (mapWidthPx / 2) * metersPerPx / 111320;
    const halfHeightDeg = (250 / 2) * metersPerPx / 111320;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - halfWidthDeg},${latitude - halfHeightDeg},${longitude + halfWidthDeg},${latitude + halfHeightDeg}&layer=mapnik&marker=${latitude},${longitude}`;
  }, [latitude, longitude, radius]);

  // Use a static image tile approach instead of iframe to prevent interaction
  // Tile math: at zoom z, tile x = floor((lon+180)/360 * 2^z), tile y = floor((1 - ln(tan(lat_rad) + sec(lat_rad))/π) / 2 * 2^z)
  
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  const mapWidthPx = 600;
  const desiredCircleFraction = 0.35;
  const desiredCirclePx = mapWidthPx * desiredCircleFraction;
  const zoom = Math.min(18, Math.max(12, Math.round(
    Math.log2((156543.03 * cosLat * desiredCirclePx) / (radius * 2))
  )));
  const metersPerPx = (156543.03 * cosLat) / Math.pow(2, zoom);
  const circleDiameterPx = (radius * 2) / metersPerPx;

  return (
    <div className="rounded-xl overflow-hidden border border-border/50 relative h-[250px]">
      {/* Map iframe - block all interaction */}
      <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
        <iframe
          title="Position de votre boutique"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          src={mapUrl}
        />
      </div>
      {/* Transparent overlay to block iframe interaction */}
      <div className="absolute inset-0" style={{ zIndex: 10 }} />
      {/* Geofence circle centered on marker */}
      <div
        className="absolute"
        style={{
          zIndex: 11,
          width: `${circleDiameterPx}px`,
          height: `${circleDiameterPx}px`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          border: "2.5px solid #eab308",
          backgroundColor: "rgba(234, 179, 8, 0.14)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export default GeofenceMap;
