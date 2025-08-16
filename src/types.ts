export type BasemapKey = "osm" | "esriImagery" | "esriStreets" | "esriTopo";

export interface Region {
  id: string;
  name: string;
  geojson: GeoJSON.Feature; // polygon/rectangle as GeoJSON
}
