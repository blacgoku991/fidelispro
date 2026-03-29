import { useMemo } from "react";

interface GeofenceMapProps {
  latitude: number;
  longitude: number;
  radius: number;
}

const MAP_WIDTH = 640;
const MAP_HEIGHT = 250;

const GeofenceMap = ({ latitude, longitude, radius }: GeofenceMapProps) => {
  const { mapUrl, circleDiameterPx } = useMemo(() => {
    const cosLat = Math.max(0.2, Math.cos((latitude * Math.PI) / 180));

    // Zoom calculé pour avoir un cercle lisible et fidèle au rayon réel
    const targetDiameterPx = MAP_WIDTH * 0.5;
    const rawZoom = Math.log2((156543.03392 * cosLat * targetDiameterPx) / (radius * 2));
    const zoom = Math.min(19, Math.max(12, Math.round(rawZoom)));

    const metersPerPixel = (156543.03392 * cosLat) / Math.pow(2, zoom);
    const diameter = Math.max(12, Math.min((radius * 2) / metersPerPixel, MAP_WIDTH * 0.95));

    const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=${zoom}&size=${MAP_WIDTH}x${MAP_HEIGHT}&maptype=mapnik`;

    return {
      mapUrl: url,
      circleDiameterPx: diameter,
    };
  }, [latitude, longitude, radius]);

  return (
    <div className="relative h-[250px] w-full overflow-hidden rounded-xl border border-border/50 select-none">
      <img
        src={mapUrl}
        alt="Carte de localisation"
        className="h-full w-full object-cover pointer-events-none"
        draggable={false}
        loading="lazy"
      />

      {/* Point exact du commerce (centre géographique) */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "12px",
          height: "12px",
          borderRadius: "9999px",
          background: "hsl(var(--primary))",
          boxShadow: "0 0 0 4px hsl(var(--background) / 0.85)",
        }}
      />

      {/* Rayon réel en mètres */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `${circleDiameterPx}px`,
          height: `${circleDiameterPx}px`,
          borderRadius: "9999px",
          border: "2px solid hsl(48 96% 53%)",
          background: "hsl(48 96% 53% / 0.2)",
        }}
      />
    </div>
  );
};

export default GeofenceMap;
