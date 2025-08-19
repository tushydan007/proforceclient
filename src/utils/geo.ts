// utils/geo.ts
export function computeCenter(geojson: GeoJSON.Feature): [number, number] {
  if (!geojson.geometry) return [0, 0];

  if (geojson.geometry.type === "Polygon") {
    const coords = geojson.geometry.coordinates[0];
    const lats = coords.map((c) => c[1]);
    const lngs = coords.map((c) => c[0]);
    return [
      lngs.reduce((a, b) => a + b, 0) / lngs.length,
      lats.reduce((a, b) => a + b, 0) / lats.length,
    ];
  }

  if (geojson.geometry.type === "Point") {
    return geojson.geometry.coordinates as [number, number];
  }

  // fallback for unsupported geometries
  return [0, 0];
}
