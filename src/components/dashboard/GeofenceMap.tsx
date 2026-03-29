interface GeofenceMapProps {
  latitude: number;
  longitude: number;
  radius: number;
}

const GeofenceMap = ({ latitude, longitude, radius }: GeofenceMapProps) => {
  // Scale zoom based on radius - larger radius needs more zoom out
  const zoomDelta = radius <= 200 ? 0.003 : radius <= 500 ? 0.005 : radius <= 1000 ? 0.01 : 0.02;
  
  // Circle size relative to the map viewport (percentage)
  // The iframe shows a bbox of 2*zoomDelta degrees wide
  // We need to convert radius (meters) to a percentage of the viewport
  // 1 degree latitude ≈ 111,320 meters
  const viewportMeters = zoomDelta * 2 * 111320;
  const circlePct = Math.min((radius * 2) / viewportMeters * 100, 95);

  return (
    <div className="rounded-xl overflow-hidden border border-border/50 h-[250px] relative">
      <iframe
        title="Position de votre boutique"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - zoomDelta},${latitude - zoomDelta * 0.6},${longitude + zoomDelta},${latitude + zoomDelta * 0.6}&layer=mapnik&marker=${latitude},${longitude}`}
      />
      {/* Yellow radius overlay */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: `${circlePct}%`,
          height: `${circlePct}%`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: '2px solid #eab308',
          backgroundColor: 'rgba(234, 179, 8, 0.15)',
        }}
      />
    </div>
  );
};

export default GeofenceMap;
