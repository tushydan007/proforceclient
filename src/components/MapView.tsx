import { useRef } from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  ScaleControl,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import type { BasemapKey, Region } from "../types";
import { useAppDispatch, useAppSelector } from "../hooks";
import { addRegion } from "../redux/slices/cartSlice";
import toast from "react-hot-toast";

const BASEMAPS: Record<BasemapKey, { url: string; attribution: string }> = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  esriImagery: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
  esriStreets: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
  esriTopo: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
};

type Props = {
  basemap: BasemapKey;
  onMapReady?: (map: L.Map) => void;
};

export default function MapView({ basemap, onMapReady }: Props) {
  const dispatch = useAppDispatch();
  const cartCount = useAppSelector((s) => s.cart.regions.length);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const mapRef = useRef<L.Map | null>(null);

  const handleCreated = (e: L.DrawEvents.Created) => {
    const layer = e.layer as L.Layer & { toGeoJSON: () => GeoJSON.Feature };
    const gj = layer.toGeoJSON();
    const id = crypto.randomUUID();

    const region: Region = {
      id,
      name: `Region ${new Date().toLocaleTimeString()}`,
      geojson: gj,
    };
    dispatch(addRegion(region));
    const nextCount = cartCount + 1;
    toast.success(`${region.name} added. Cart: ${nextCount}`, {
      duration: 2500,
    });
  };

  return (
    <div className="h-[calc(100vh-64px)]">
      <MapContainer
        center={[9.082, 8.6753]}
        zoom={6}
        className="h-full w-full"
        ref={(mapInstance) => {
          if (mapInstance) {
            mapRef.current = mapInstance;
            onMapReady?.(mapInstance);
          }
        }}
        // whenCreated={(m: L.Map) => onMapReady?.(m)}
      >
        <TileLayer {...BASEMAPS[basemap]} />
        <ScaleControl position="bottomleft" />
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topleft"
            onCreated={handleCreated}
            draw={{
              polygon: { allowIntersection: false, showArea: true },
              rectangle: true,
              polyline: false,
              circle: false,
              marker: false,
              circlemarker: false,
            }}
            edit={{ edit: {}, remove: true }}
          />
        </FeatureGroup>
      </MapContainer>
    </div>
  );
}
