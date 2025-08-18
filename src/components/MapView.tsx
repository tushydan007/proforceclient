import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, ScaleControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-editable"; // must be imported to patch Leaflet

import type { BasemapKey, Region } from "../types";
import { useAppDispatch, useAppSelector } from "../hooks";
import { addRegion } from "../redux/slices/cartSlice";
import toast from "react-hot-toast";

// Basemaps
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

/**
 * Handles "editable:created" event from Leaflet.Editable
 */
function EditableHandler() {
  const dispatch = useAppDispatch();
  const cartCount = useAppSelector((s) => s.cart.regions.length);
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handleCreated = (e: any) => {
      try {
        const layer = e.layer as L.Layer & {
          toGeoJSON?: () => GeoJSON.Feature;
        };
        if (!layer.toGeoJSON) return;

        const gj = layer.toGeoJSON();
        const id = crypto.randomUUID();

        const region: Region = {
          id,
          name: `Region ${new Date().toLocaleTimeString()}`,
          geojson: gj,
        };
        dispatch(addRegion(region));
        toast.success(`${region.name} added. Cart: ${cartCount + 1}`, {
          duration: 2500,
        });
      } catch (err) {
        console.error("Error handling created region:", err);
      }
    };

    map.on("editable:created", handleCreated);
    return () => {
      map.off("editable:created", handleCreated);
    };
  }, [map, dispatch, cartCount]);

  return null;
}

export default function MapView({ basemap, onMapReady }: Props) {
  const mapRef = useRef<L.Map | null>(null);

  return (
    <div className="h-[calc(100vh-64px)] relative">
      <MapContainer
        center={[9.082, 8.6753]}
        zoom={6}
        className="h-full w-full"
        ref={(map) => {
          if (!map) return;
          mapRef.current = map;
          map.editTools = new L.Editable(map);
          onMapReady?.(map);
        }}
      >
        <TileLayer {...BASEMAPS[basemap]} />
        <ScaleControl position="bottomleft" />
        <EditableHandler />
      </MapContainer>

      {/* Floating buttons for drawing */}
      <div className="absolute top-2 right-4 bg-white p-2 rounded shadow space-x-2 z-[1000]">
        <button
          onClick={() =>
            mapRef.current && (mapRef.current as any).editTools.startPolygon()
          }
          className="px-2 py-1 bg-blue-500 text-white rounded"
        >
          Polygon
        </button>
        <button
          onClick={() =>
            mapRef.current && (mapRef.current as any).editTools.startRectangle()
          }
          className="px-2 py-1 bg-green-500 text-white rounded"
        >
          Rectangle
        </button>
      </div>
    </div>
  );
}






// import { useEffect, useRef } from "react";
// import { MapContainer, TileLayer, ScaleControl, useMap } from "react-leaflet";
// import L from "leaflet";
// import "leaflet-editable"; // important: import leaflet-editable
// import type { BasemapKey, Region } from "../types";
// import { useAppDispatch, useAppSelector } from "../hooks";
// import { addRegion } from "../redux/slices/cartSlice";
// import toast from "react-hot-toast";
// import "leaflet/dist/leaflet.css";

// const BASEMAPS: Record<BasemapKey, { url: string; attribution: string }> = {
//   osm: {
//     url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
//     attribution: "&copy; OpenStreetMap contributors",
//   },
//   esriImagery: {
//     url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
//     attribution: "Tiles &copy; Esri",
//   },
//   esriStreets: {
//     url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
//     attribution: "Tiles &copy; Esri",
//   },
//   esriTopo: {
//     url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
//     attribution: "Tiles &copy; Esri",
//   },
// };

// type Props = {
//   basemap: BasemapKey;
//   onMapReady?: (map: L.Map) => void;
// };

// function EditableHandler() {
//   const dispatch = useAppDispatch();
//   const cartCount = useAppSelector((s) => s.cart.regions.length);
//   const map = useMap();

//   useEffect(() => {
//     if (!map) return;

//     // Listen for when a new editable layer is created
//     const handleCreated = (e: any) => {
//       const layer = e.layer as L.Layer & { toGeoJSON: () => GeoJSON.Feature };
//       const gj = layer.toGeoJSON();
//       const id = crypto.randomUUID();

//       const region: Region = {
//         id,
//         name: `Region ${new Date().toLocaleTimeString()}`,
//         geojson: gj,
//       };
//       dispatch(addRegion(region));
//       const nextCount = cartCount + 1;
//       toast.success(`${region.name} added. Cart: ${nextCount}`, {
//         duration: 2500,
//       });
//     };

//     map.on("editable:created", handleCreated);

//     return () => {
//       map.off("editable:created", handleCreated);
//     };
//   }, [map, dispatch, cartCount]);

//   return null;
// }

// export default function MapView({ basemap, onMapReady }: Props) {
//   const mapRef = useRef<L.Map | null>(null);

//   return (
//     <div className="h-[calc(100vh-64px)]">
//       {/* <MapContainer
//         center={[9.082, 8.6753]}
//         zoom={6}
//         className="h-full w-full"
//         editable={true} // enable leaflet-editable
//         ref={(mapInstance) => {
//           if (mapInstance) {
//             mapRef.current = mapInstance;
//             onMapReady?.(mapInstance);
//           }
//         }}
//       >
//         <TileLayer {...BASEMAPS[basemap]} />
//         <ScaleControl position="bottomleft" />
//         <EditableHandler />
//       </MapContainer> */}

//       <MapContainer
//         center={[9.082, 8.6753]}
//         zoom={6}
//         className="h-full w-full"
//         ref={(mapInstance) => {
//           if (mapInstance) {
//             mapRef.current = mapInstance;

//             // Enable Leaflet.Editable manually
//             mapInstance.editTools = new L.Editable(mapInstance);

//             onMapReady?.(mapInstance);
//           }
//         }}
//       >
//         <TileLayer {...BASEMAPS[basemap]} />
//         <ScaleControl position="bottomleft" />
//         <EditableHandler />
//       </MapContainer>

//       {/* Example simple controls for drawing */}
//       <div className="absolute top-4 left-4 bg-white p-2 rounded shadow space-x-2 z-[1000]">
//         <button
//           onClick={() => mapRef.current?.editTools.startPolygon()}
//           className="px-2 py-1 bg-blue-500 text-white rounded"
//         >
//           Polygon
//         </button>
//         <button
//           onClick={() => mapRef.current?.editTools.startRectangle()}
//           className="px-2 py-1 bg-green-500 text-white rounded"
//         >
//           Rectangle
//         </button>
//       </div>
//     </div>
//   );
// }
