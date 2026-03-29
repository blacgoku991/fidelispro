interface GeofenceMapProps {
  latitude: number;
  longitude: number;
  radius: number;
}

const GeofenceMap = ({ latitude, longitude, radius }: GeofenceMapProps) => {
  // Use a static tile approach: render an iframe centered exactly on the marker
  // and overlay a precisely positioned circle
  
  // Calculate the zoom level based on radius to ensure the circle fits nicely
  // At zoom 15, 1 pixel ≈ 4.78 meters at equator, adjusted by cos(lat)
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  
  // We want the circle to take about 40-60% of the map width (400px wide map)
  // meters per pixel = 156543.03 * cos(lat) / 2^zoom
  // We want: radius * 2 in pixels ≈ 200px (half the map width)
  // So: zoom = log2(156543.03 * cos(lat) * 200 / (radius * 2)) 
  const mapWidthPx = 600;
  const desiredCirclePx = mapWidthPx * 0.4; // circle diameter = 40% of map
  const zoom = Math.min(18, Math.max(12, Math.round(
    Math.log2((156543.03 * cosLat * desiredCirclePx) / (radius * 2))
  )));
  
  // At this zoom, calculate meters per pixel
  const metersPerPx = (156543.03 * cosLat) / Math.pow(2, zoom);
  
  // Circle diameter in pixels
  const circleDiameterPx = (radius * 2) / metersPerPx;
  
  // Use OpenStreetMap static embed centered on the point
  // The bbox needs to be calculated from zoom + map dimensions
  const mapHeightPx = 250;
  const halfWidthDeg = (mapWidthPx / 2) * metersPerPx / 111320;
  const halfHeightDeg = (mapHeightPx / 2) * metersPerPx / 111320;
  
  const bbox = {
    west: longitude - halfWidthDeg,
    south: latitude - halfHeightDeg,
    east: longitude + halfWidthDeg,
    north: latitude + halfHeightDeg,
  };

  return (
    <div className="rounded-xl overflow-hidden border border-border/50 relative" style={{ height: `${mapHeightPx}px` }}>
      <iframe
        title="Position de votre boutique"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}&layer=mapnik&marker=${latitude},${longitude}`}
      />
      {/* Geofence radius circle - centered on the marker which is at center of map */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${mapWidthPx} ${mapHeightPx}`}
        preserveAspectRatio="none"
      >
        <circle
          cx={mapWidthPx / 2}
          cy={mapHeightPx / 2}
          r={circleDiameterPx / 2}
          fill="rgba(234, 179, 8, 0.15)"
          stroke="#eab308"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

export default GeofenceMap;
