import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, ScaleControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-editable";
import type { BasemapKey, Region } from "../types";
import { useAppDispatch, useAppSelector } from "../hooks";
import { addRegion, setSelectedRegion } from "../redux/slices/cartSlice";
import { toast } from "react-hot-toast";

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

// Styles
const defaultStyle = { color: "blue", weight: 2, fillOpacity: 0.2 };
const highlightStyle = { color: "orange", weight: 3, fillOpacity: 0.4 };
const inCartStyle = { color: "green", weight: 2, fillOpacity: 0.3 };

type Props = {
  basemap: BasemapKey;
  onMapReady?: (map: L.Map) => void;
};

// Define GeoLayer for layers that support toGeoJSON (Polygon, Rectangle, etc.)
type GeoLayer = (L.Polygon | L.Rectangle) & {
  toGeoJSON: () => GeoJSON.Feature;
  options: { regionId?: string };
};

// Reverse geocode
async function getRegionName(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    return data?.display_name || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  } catch {
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
}

// Compute centroid for Redux state
function computeCenter(gj: GeoJSON.Feature): [number, number] {
  const coords =
    gj.geometry.type === "Polygon"
      ? gj.geometry.coordinates[0]
      : gj.geometry.type === "MultiPolygon"
      ? gj.geometry.coordinates[0][0]
      : [];

  const lats = coords.map((c: number[]) => c[1]);
  const lngs = coords.map((c: number[]) => c[0]);
  return [
    lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length,
    lats.reduce((a: number, b: number) => a + b, 0) / lats.length,
  ];
}

// Handles drawing new features
function EditableHandler({
  onSelectRegion,
}: {
  onSelectRegion: (layer: GeoLayer, gj: GeoJSON.Feature) => void;
}) {
  const map = useMap();
  const dispatch = useAppDispatch();

  useEffect(() => {
    try {
      if (!map.editTools) {
        map.editTools = new (L as any).Editable(map);
      }

      const handleCreated = (e: any) => {
        try {
          const layer = e.layer as GeoLayer;
          if (!layer.toGeoJSON) return;
          const gj = layer.toGeoJSON();
          (layer as any).options.regionId = crypto.randomUUID();

          if ((layer as any).setStyle) (layer as any).setStyle(defaultStyle);

          // Click to select
          layer.on("click", () => onSelectRegion(layer, gj));

          // Update Redux on edit
          layer.on("editable:editing", () => {
            const updatedGj = layer.toGeoJSON();
            dispatch(
              setSelectedRegion({
                id: (layer as any).options.regionId,
                name: "Updating...",
                geojson: updatedGj,
                center: computeCenter(updatedGj),
              })
            );
          });
        } catch (err) {
          console.error("Error in handleCreated:", err);
        }
      };

      map.on("editable:created", handleCreated);
      return () => {
        // Wrap map.off in a function to ensure it returns void
        map.off("editable:created", handleCreated);
      };
    } catch (err) {
      console.error("Error initializing editable:", err);
      return () => {}; // Return an empty cleanup function in case of error
    }
  }, [map, onSelectRegion, dispatch]);

  return null;
}

// Escape stops drawing
function StopDrawingOnEsc() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        (map as any).editTools.stopDrawing();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [map]);
  return null;
}

// Compute centroid for Redux state
// function computeCenter(gj: GeoJSON.Feature): [number, number] {
//   const coords =
//     gj.geometry.type === "Polygon"
//       ? gj.geometry.coordinates[0]
//       : gj.geometry.type === "MultiPolygon"
//       ? gj.geometry.coordinates[0][0]
//       : [];
//   const lats = coords.map((c: number[]) => c[1]);
//   const lngs = coords.map((c: number[]) => c[0]);
//   return [
//     lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length,
//     lats.reduce((a: number, b: number) => a + b, 0) / lats.length,
//   ];
// }

export default function MapView({ basemap, onMapReady }: Props) {
  const dispatch = useAppDispatch();
  const cartRegions = useAppSelector((s) => s.cart.regions);
  const mapRef = useRef<L.Map | null>(null);
  const [selected, setSelected] = useState<{
    layer: GeoLayer;
    geojson: GeoJSON.Feature;
    name: string;
  } | null>(null);

  // Select region
  const handleSelectRegion = async (layer: GeoLayer, gj: GeoJSON.Feature) => {
    try {
      // Reset previous style
      if (selected?.layer && (selected.layer as any).setStyle) {
        const prevId = (selected.layer as any).options.regionId;
        const inCart = cartRegions.some((r) => r.id === prevId);
        (selected.layer as any).setStyle(inCart ? inCartStyle : defaultStyle);
      }

      // Highlight current
      if ((layer as any).setStyle) (layer as any).setStyle(highlightStyle);

      // Get centroid for name
      const center = computeCenter(gj);
      const name = await getRegionName(center[1], center[0]);

      // Update Redux
      const id = (layer as any).options.regionId;
      dispatch(
        setSelectedRegion({
          id,
          name,
          geojson: layer.toGeoJSON(),
          center,
        })
      );

      setSelected({ layer, geojson: gj, name });
    } catch (err) {
      console.error("Error in handleSelectRegion:", err);
      toast.error("Failed to select region");
    }
  };

  // Confirm add
  const handleConfirmAdd = () => {
    if (!selected) return;
    const id = (selected.layer as any).options.regionId;
    const freshGj = selected.layer.toGeoJSON();
    if (!freshGj) return;

    const region: Region = {
      id,
      name: selected.name,
      geojson: freshGj,
      center: computeCenter(freshGj),
    };
    // Log region attributes for debugging
    console.log("Selected Region Attributes:", {
      id: region.id,
      name: region.name,
      geojson: region.geojson,
      center: region.center,
    });

    dispatch(addRegion(region));
    toast.success(`${region.name} added to cart`);

    if ((selected.layer as any).setStyle)
      (selected.layer as any).setStyle(inCartStyle);
    setSelected(null);
    dispatch(setSelectedRegion(null));
  };

  // Cancel add
  const handleCancelAdd = () => {
    if (!selected) return;
    if ((selected.layer as any).setStyle)
      (selected.layer as any).setStyle(defaultStyle);
    setSelected(null);
    dispatch(setSelectedRegion(null));
    toast("Add to cart cancelled");
  };

  return (
    <div className="h-[calc(100vh-64px)] relative">
      <MapContainer
        center={[9.082, 8.6753]}
        zoom={6}
        className="h-full w-full"
        ref={(map) => {
          if (!map) return;
          mapRef.current = map;
          try {
            map.editTools = new (L as any).Editable(map);
            onMapReady?.(map);
          } catch (err) {
            console.error("Error initializing map editTools:", err);
          }
        }}
      >
        <TileLayer {...BASEMAPS[basemap]} />
        <ScaleControl position="bottomleft" />
        <EditableHandler onSelectRegion={handleSelectRegion} />
        <StopDrawingOnEsc />
      </MapContainer>

      {/* Floating draw buttons */}
      <div className="absolute top-2 right-4 bg-white p-2 rounded shadow space-x-2 z-[1000]">
        <button
          onClick={() =>
            mapRef.current && (mapRef.current as any).editTools.startPolygon()
          }
          className="px-2 py-1 bg-blue-500 text-white rounded transition-colors duration-300 hover:bg-blue-600"
        >
          Polygon
        </button>
        <button
          onClick={() =>
            mapRef.current && (mapRef.current as any).editTools.startRectangle()
          }
          className="px-2 py-1 bg-green-500 text-white rounded transition-colors duration-300 hover:bg-green-600"
        >
          Rectangle
        </button>
      </div>

      {/* Confirmation panel */}
      {selected && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg p-4 rounded-lg z-[2000] w-80 text-center">
          <h3 className="font-semibold mb-2">Add Region?</h3>
          <p className="text-sm mb-4">{selected.name}</p>
          <div className="flex justify-between space-x-2">
            <button
              onClick={handleConfirmAdd}
              className="flex-1 px-3 py-1 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 transition-colors"
            >
              Add to Cart
            </button>
            <button
              onClick={handleCancelAdd}
              className="flex-1 px-3 py-1 bg-gray-400 text-white rounded cursor-pointer hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// MapView.tsx
// import { useEffect, useRef, useState } from "react";
// import { MapContainer, TileLayer, ScaleControl, useMap } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import "leaflet-editable";

// import type { BasemapKey, Region } from "../types";
// import { useAppDispatch, useAppSelector } from "../hooks";
// import { addRegion } from "../redux/slices/cartSlice";
// import toast from "react-hot-toast";

// // Basemaps
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

// // Styles
// const defaultStyle = { color: "blue", weight: 2, fillOpacity: 0.2 };
// const highlightStyle = { color: "orange", weight: 3, fillOpacity: 0.4 };
// const inCartStyle = { color: "green", weight: 2, fillOpacity: 0.3 };

// type Props = {
//   basemap: BasemapKey;
//   onMapReady?: (map: L.Map) => void;
// };

// // Reverse geocode
// async function getRegionName(lat: number, lng: number): Promise<string> {
//   try {
//     const res = await fetch(
//       `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
//     );
//     const data = await res.json();
//     return data?.display_name || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
//   } catch {
//     return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
//   }
// }

// // Handles drawing new features
// function EditableHandler({
//   onSelectRegion,
// }: {
//   onSelectRegion: (layer: L.Layer, gj: GeoJSON.Feature) => void;
// }) {
//   const map = useMap();

//   useEffect(() => {
//     if (!map) return;

//     const handleCreated = (e: any) => {
//       const layer = e.layer as L.Layer & { toGeoJSON?: () => GeoJSON.Feature };
//       if (!layer.toGeoJSON) return;
//       const gj = layer.toGeoJSON();
//       (layer as any).options.regionId = crypto.randomUUID();

//       if ((layer as any).setStyle) (layer as any).setStyle(defaultStyle);

//       // click to select later
//       layer.on("click", () => onSelectRegion(layer, gj));
//     };

//     map.on("editable:created", handleCreated);
//     return () => {
//       map.off("editable:created", handleCreated);
//     };
//   }, [map, onSelectRegion]);

//   return null;
// }

// // Escape stops drawing
// function StopDrawingOnEsc() {
//   const map = useMap();
//   useEffect(() => {
//     if (!map) return;
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if (e.key === "Escape") {
//         (map as any).editTools.stopDrawing();
//       }
//     };
//     window.addEventListener("keydown", handleKeyDown);
//     return () => window.removeEventListener("keydown", handleKeyDown);
//   }, [map]);
//   return null;
// }

// export default function MapView({ basemap, onMapReady }: Props) {
//   const dispatch = useAppDispatch();
//   const cartRegions = useAppSelector((s) => s.cart.regions);
//   const mapRef = useRef<L.Map | null>(null);

//   const [selected, setSelected] = useState<{
//     layer: L.Layer & { toGeoJSON?: () => GeoJSON.Feature };
//     geojson: GeoJSON.Feature;
//     name: string;
//   } | null>(null);

//   // Select region
//   const handleSelectRegion = async (
//     layer: L.Layer & { toGeoJSON?: () => GeoJSON.Feature },
//     gj: GeoJSON.Feature
//   ) => {
//     // Reset prev style
//     if (selected?.layer && (selected.layer as any).setStyle) {
//       const prevId = (selected.layer as any).options.regionId;
//       const inCart = cartRegions.some((r) => r.id === prevId);
//       (selected.layer as any).setStyle(inCart ? inCartStyle : defaultStyle);
//     }

//     // Highlight current
//     if ((layer as any).setStyle) (layer as any).setStyle(highlightStyle);

//     // Get centroid for name
//     const coords =
//       gj.geometry.type === "Polygon"
//         ? gj.geometry.coordinates[0]
//         : gj.geometry.type === "MultiPolygon"
//         ? gj.geometry.coordinates[0][0]
//         : null;

//     let name = "Unnamed region";
//     if (coords) {
//       const latlngs = coords.map((c: any) => [c[1], c[0]]);
//       const centroid = latlngs.reduce(
//         (acc, cur) => [acc[0] + cur[0], acc[1] + cur[1]],
//         [0, 0]
//       );
//       const center = [
//         centroid[0] / latlngs.length,
//         centroid[1] / latlngs.length,
//       ];
//       name = await getRegionName(center[0], center[1]);
//     }

//     setSelected({ layer, geojson: gj, name });
//   };

//   // Confirm add
//   const handleConfirmAdd = () => {
//     if (!selected) return;
//     const id = (selected.layer as any).options.regionId;

//     const region: Region = {
//       id,
//       name: selected.name,
//       geojson: selected.geojson,
//     };
//     dispatch(addRegion(region));
//     toast.success(`${region.name} added to cart`);

//     if ((selected.layer as any).setStyle)
//       (selected.layer as any).setStyle(inCartStyle);
//     setSelected(null);
//   };

//   // Cancel add
//   const handleCancelAdd = () => {
//     if (!selected) return;
//     if ((selected.layer as any).setStyle)
//       (selected.layer as any).setStyle(defaultStyle);
//     setSelected(null);
//     toast("Add to cart cancelled");
//   };

//   return (
//     <div className="h-[calc(100vh-64px)] relative">
//       <MapContainer
//         center={[9.082, 8.6753]}
//         zoom={6}
//         className="h-full w-full"
//         ref={(map) => {
//           if (!map) return;
//           mapRef.current = map;
//           map.editTools = new L.Editable(map);
//           onMapReady?.(map);
//         }}
//       >
//         <TileLayer {...BASEMAPS[basemap]} />
//         <ScaleControl position="bottomleft" />
//         <EditableHandler onSelectRegion={handleSelectRegion} />
//         <StopDrawingOnEsc />
//       </MapContainer>

//       {/* Floating draw buttons */}
//       <div className="absolute top-2 right-4 bg-white p-2 rounded shadow space-x-2 z-[1000]">
//         <button
//           onClick={() =>
//             mapRef.current && (mapRef.current as any).editTools.startPolygon()
//           }
//           className="px-2 py-1 bg-blue-500 text-white rounded transition-colors duration-300 hover:bg-blue-600"
//         >
//           Polygon
//         </button>
//         <button
//           onClick={() =>
//             mapRef.current && (mapRef.current as any).editTools.startRectangle()
//           }
//           className="px-2 py-1 bg-green-500 text-white rounded transition-colors duration-300 hover:bg-green-600"
//         >
//           Rectangle
//         </button>
//       </div>

//       {/* Confirmation panel */}
//       {selected && (
//         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg p-4 rounded-lg z-[2000] w-80 text-center">
//           <h3 className="font-semibold mb-2">Add Region?</h3>
//           <p className="text-sm mb-4">{selected.name}</p>
//           <div className="flex justify-between space-x-2">
//             <button
//               onClick={handleConfirmAdd}
//               className="flex-1 px-3 py-1 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 transition-colors"
//             >
//               Add to Cart
//             </button>
//             <button
//               onClick={handleCancelAdd}
//               className="flex-1 px-3 py-1 bg-gray-400 text-white rounded cursor-pointer hover:bg-gray-500 transition-colors"
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
