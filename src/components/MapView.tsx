import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, ScaleControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-editable";

import type { BasemapKey, Region } from "../types";
import { useAppDispatch, useAppSelector } from "../hooks";
import { addRegion, removeRegion } from "../redux/slices/cartSlice";
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

function EditableHandler({
  onRegionDrawn,
}: {
  onRegionDrawn: (r: Region, layer: L.Layer) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handleCreated = (e: any) => {
      const layer = e.layer as L.Layer & { toGeoJSON?: () => GeoJSON.Feature };
      if (!layer.toGeoJSON) return;

      const gj = layer.toGeoJSON();
      const id = crypto.randomUUID();

      const region: Region = {
        id,
        name: `Region ${new Date().toLocaleTimeString()}`,
        geojson: gj,
      };

      // pass up
      onRegionDrawn(region, layer);
    };

    map.on("editable:created", handleCreated);
    return () => {
      map.off("editable:created", handleCreated);
    };
  }, [map, onRegionDrawn]);

  return null;
}

export default function MapView({ basemap, onMapReady }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const dispatch = useAppDispatch();
  const cartRegions = useAppSelector((s) => s.cart.regions);

  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [regionName, setRegionName] = useState("");
  const [regionLayer, setRegionLayer] = useState<L.Layer | null>(null);

  const handleAddToCart = () => {
    if (selectedRegion) {
      const regionToAdd: Region = {
        ...selectedRegion,
        name: regionName.trim() || selectedRegion.name,
      };

      dispatch(addRegion(regionToAdd));
      toast.success(`${regionToAdd.name} added to cart`);
      cleanupSelection();
    }
  };

  const handleRemoveFromCart = () => {
    if (selectedRegion) {
      dispatch(removeRegion(selectedRegion.id));
      toast.success(`${selectedRegion.name} removed from cart`);
      cleanupSelection();
    }
  };

  const handleCancel = () => {
    if (mapRef.current && regionLayer) {
      mapRef.current.removeLayer(regionLayer);
    }
    cleanupSelection();
  };

  const cleanupSelection = () => {
    setSelectedRegion(null);
    setRegionName("");
    setRegionLayer(null);
  };

  const attachClickHandler = (region: Region, layer: L.Layer) => {
    layer.on("click", () => {
      setSelectedRegion(region);
      setRegionName(region.name);
      setRegionLayer(layer);
    });
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
          map.editTools = new L.Editable(map);
          onMapReady?.(map);
        }}
      >
        <TileLayer {...BASEMAPS[basemap]} />
        <ScaleControl position="bottomleft" />
        <EditableHandler
          onRegionDrawn={(region, layer) => {
            attachClickHandler(region, layer);
            setSelectedRegion(region);
            setRegionName(region.name);
            setRegionLayer(layer);
          }}
        />
      </MapContainer>

      {/* Draw buttons */}
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

      {/* Popup control */}
      {selectedRegion && (
        <div className="absolute bottom-4 right-4 bg-white p-3 rounded shadow-lg w-64 z-[1000]">
          <label className="block text-sm font-medium mb-1">Region Name</label>
          <input
            type="text"
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
            className="w-full border rounded px-2 py-1 mb-3"
          />

          <div className="flex space-x-2">
            {cartRegions.some((r) => r.id === selectedRegion.id) ? (
              <button
                onClick={handleRemoveFromCart}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Remove
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Add
              </button>
            )}
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}




// Functionality to cancel if the user does not want to add item to cart
// import { useEffect, useRef, useState } from "react";
// import { MapContainer, TileLayer, ScaleControl, useMap } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import "leaflet-editable"; // must be imported to patch Leaflet

// import type { BasemapKey, Region } from "../types";
// import { useAppDispatch } from "../hooks";
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

// type Props = {
//   basemap: BasemapKey;
//   onMapReady?: (map: L.Map) => void;
// };

// /**
//  * Handles "editable:created" event from Leaflet.Editable
//  */
// function EditableHandler({ onRegionDrawn }: { onRegionDrawn: (r: Region, layer: L.Layer) => void }) {
//   const map = useMap();

//   useEffect(() => {
//     if (!map) return;

//     const handleCreated = (e: any) => {
//       try {
//         const layer = e.layer as L.Layer & {
//           toGeoJSON?: () => GeoJSON.Feature;
//         };
//         if (!layer.toGeoJSON) return;

//         const gj = layer.toGeoJSON();
//         const id = crypto.randomUUID();

//         const region: Region = {
//           id,
//           name: `Region ${new Date().toLocaleTimeString()}`, // default name
//           geojson: gj,
//         };

//         // Pass region + layer up (so we can remove if user cancels)
//         onRegionDrawn(region, layer);
//       } catch (err) {
//         console.error("Error handling created region:", err);
//       }
//     };

//     map.on("editable:created", handleCreated);
//     return () => {
//       map.off("editable:created", handleCreated);
//     };
//   }, [map, onRegionDrawn]);

//   return null;
// }

// export default function MapView({ basemap, onMapReady }: Props) {
//   const mapRef = useRef<L.Map | null>(null);
//   const dispatch = useAppDispatch();

//   // State to hold drawn region and editable name
//   const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
//   const [regionName, setRegionName] = useState("");
//   const [regionLayer, setRegionLayer] = useState<L.Layer | null>(null);

//   const handleAddToCart = () => {
//     if (selectedRegion) {
//       const regionToAdd: Region = {
//         ...selectedRegion,
//         name: regionName.trim() || selectedRegion.name,
//       };

//       dispatch(addRegion(regionToAdd));
//       toast.success(`${regionToAdd.name} added to cart`, { duration: 2500 });

//       // Clear after adding
//       cleanupSelection();
//     }
//   };

//   const handleCancel = () => {
//     if (mapRef.current && regionLayer) {
//       mapRef.current.removeLayer(regionLayer); // remove from map
//     }
//     cleanupSelection();
//   };

//   const cleanupSelection = () => {
//     setSelectedRegion(null);
//     setRegionName("");
//     setRegionLayer(null);
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
//         <EditableHandler
//           onRegionDrawn={(region, layer) => {
//             setSelectedRegion(region);
//             setRegionName(region.name);
//             setRegionLayer(layer);
//           }}
//         />
//       </MapContainer>

//       {/* Floating buttons for drawing */}
//       <div className="absolute top-2 right-4 bg-white p-2 rounded shadow space-x-2 z-[1000]">
//         <button
//           onClick={() =>
//             mapRef.current && (mapRef.current as any).editTools.startPolygon()
//           }
//           className="px-2 py-1 bg-blue-500 text-white rounded"
//         >
//           Polygon
//         </button>
//         <button
//           onClick={() =>
//             mapRef.current && (mapRef.current as any).editTools.startRectangle()
//           }
//           className="px-2 py-1 bg-green-500 text-white rounded"
//         >
//           Rectangle
//         </button>
//       </div>

//       {/* Floating "Add to Cart" panel if a region is selected */}
//       {selectedRegion && (
//         <div className="absolute bottom-4 right-4 bg-white p-3 rounded shadow-lg w-64 z-[1000]">
//           <label className="block text-sm font-medium mb-1">Region Name</label>
//           <input
//             type="text"
//             value={regionName}
//             onChange={(e) => setRegionName(e.target.value)}
//             className="w-full border rounded px-2 py-1 mb-3"
//           />
//           <div className="flex space-x-2">
//             <button
//               onClick={handleAddToCart}
//               className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
//             >
//               Add to Cart
//             </button>
//             <button
//               onClick={handleCancel}
//               className="flex-1 px-3 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }





// functionaliy for the user to change the default name of the region b4 addint it to cart
// import { useEffect, useRef, useState } from "react";
// import { MapContainer, TileLayer, ScaleControl, useMap } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import "leaflet-editable"; // must be imported to patch Leaflet

// import type { BasemapKey, Region } from "../types";
// import { useAppDispatch } from "../hooks";
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

// type Props = {
//   basemap: BasemapKey;
//   onMapReady?: (map: L.Map) => void;
// };

// /**
//  * Handles "editable:created" event from Leaflet.Editable
//  */
// function EditableHandler({ onRegionDrawn }: { onRegionDrawn: (r: Region, layer: L.Layer) => void }) {
//   const map = useMap();

//   useEffect(() => {
//     if (!map) return;

//     const handleCreated = (e: any) => {
//       try {
//         const layer = e.layer as L.Layer & {
//           toGeoJSON?: () => GeoJSON.Feature;
//         };
//         if (!layer.toGeoJSON) return;

//         const gj = layer.toGeoJSON();
//         const id = crypto.randomUUID();

//         const region: Region = {
//           id,
//           name: `Region ${new Date().toLocaleTimeString()}`, // default name
//           geojson: gj,
//         };

//         // Pass region + layer up (so we can remove if user cancels)
//         onRegionDrawn(region, layer);
//       } catch (err) {
//         console.error("Error handling created region:", err);
//       }
//     };

//     map.on("editable:created", handleCreated);
//     return () => {
//       map.off("editable:created", handleCreated);
//     };
//   }, [map, onRegionDrawn]);

//   return null;
// }

// export default function MapView({ basemap, onMapReady }: Props) {
//   const mapRef = useRef<L.Map | null>(null);
//   const dispatch = useAppDispatch();

//   // State to hold drawn region and editable name
//   const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
//   const [regionName, setRegionName] = useState("");
//   const [regionLayer, setRegionLayer] = useState<L.Layer | null>(null);

//   const handleAddToCart = () => {
//     if (selectedRegion) {
//       const regionToAdd: Region = {
//         ...selectedRegion,
//         name: regionName.trim() || selectedRegion.name,
//       };

//       dispatch(addRegion(regionToAdd));
//       toast.success(`${regionToAdd.name} added to cart`, { duration: 2500 });

//       // Clear after adding
//       cleanupSelection();
//     }
//   };

//   const handleCancel = () => {
//     if (mapRef.current && regionLayer) {
//       mapRef.current.removeLayer(regionLayer); // remove from map
//     }
//     cleanupSelection();
//   };

//   const cleanupSelection = () => {
//     setSelectedRegion(null);
//     setRegionName("");
//     setRegionLayer(null);
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
//         <EditableHandler
//           onRegionDrawn={(region, layer) => {
//             setSelectedRegion(region);
//             setRegionName(region.name);
//             setRegionLayer(layer);
//           }}
//         />
//       </MapContainer>

//       {/* Floating buttons for drawing */}
//       <div className="absolute top-2 right-4 bg-white p-2 rounded shadow space-x-2 z-[1000]">
//         <button
//           onClick={() =>
//             mapRef.current && (mapRef.current as any).editTools.startPolygon()
//           }
//           className="px-2 py-1 bg-blue-500 text-white rounded"
//         >
//           Polygon
//         </button>
//         <button
//           onClick={() =>
//             mapRef.current && (mapRef.current as any).editTools.startRectangle()
//           }
//           className="px-2 py-1 bg-green-500 text-white rounded"
//         >
//           Rectangle
//         </button>
//       </div>

//       {/* Floating "Add to Cart" panel if a region is selected */}
//       {selectedRegion && (
//         <div className="absolute bottom-4 right-4 bg-white p-3 rounded shadow-lg w-64 z-[1000]">
//           <label className="block text-sm font-medium mb-1">Region Name</label>
//           <input
//             type="text"
//             value={regionName}
//             onChange={(e) => setRegionName(e.target.value)}
//             className="w-full border rounded px-2 py-1 mb-3"
//           />
//           <div className="flex space-x-2">
//             <button
//               onClick={handleAddToCart}
//               className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
//             >
//               Add to Cart
//             </button>
//             <button
//               onClick={handleCancel}
//               className="flex-1 px-3 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }






// import { useEffect, useRef, useState } from "react";
// import { MapContainer, TileLayer, ScaleControl, useMap } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import "leaflet-editable"; // must be imported to patch Leaflet

// import type { BasemapKey, Region } from "../types";
// import { useAppDispatch } from "../hooks";
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

// type Props = {
//   basemap: BasemapKey;
//   onMapReady?: (map: L.Map) => void;
// };

// /**
//  * Handles "editable:created" event from Leaflet.Editable
//  */
// function EditableHandler({
//   onRegionDrawn,
// }: {
//   onRegionDrawn: (r: Region) => void;
// }) {
//   const map = useMap();

//   useEffect(() => {
//     if (!map) return;

//     const handleCreated = (e: any) => {
//       try {
//         const layer = e.layer as L.Layer & {
//           toGeoJSON?: () => GeoJSON.Feature;
//         };
//         if (!layer.toGeoJSON) return;

//         const gj = layer.toGeoJSON();
//         const id = crypto.randomUUID();

//         const region: Region = {
//           id,
//           name: `Region ${new Date().toLocaleTimeString()}`,
//           geojson: gj,
//         };

//         // Instead of dispatching directly → pass region up
//         onRegionDrawn(region);
//       } catch (err) {
//         console.error("Error handling created region:", err);
//       }
//     };

//     map.on("editable:created", handleCreated);
//     return () => {
//       map.off("editable:created", handleCreated);
//     };
//   }, [map, onRegionDrawn]);

//   return null;
// }

// export default function MapView({ basemap, onMapReady }: Props) {
//   const mapRef = useRef<L.Map | null>(null);
//   const dispatch = useAppDispatch();

//   // State to hold the most recently drawn region
//   const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

//   const handleAddToCart = () => {
//     if (selectedRegion) {
//       dispatch(addRegion(selectedRegion));
//       toast.success(`${selectedRegion.name} added to cart`, { duration: 2500 });
//       setSelectedRegion(null); // clear after adding
//     }
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
//         <EditableHandler onRegionDrawn={setSelectedRegion} />
//       </MapContainer>

//       {/* Floating buttons for drawing */}
//       <div className="absolute top-2 right-4 bg-white p-2 rounded shadow space-x-2 z-[1000]">
//         <button
//           onClick={() =>
//             mapRef.current && (mapRef.current as any).editTools.startPolygon()
//           }
//           className="px-2 py-1 bg-blue-500 text-white rounded"
//         >
//           Polygon
//         </button>
//         <button
//           onClick={() =>
//             mapRef.current && (mapRef.current as any).editTools.startRectangle()
//           }
//           className="px-2 py-1 bg-green-500 text-white rounded"
//         >
//           Rectangle
//         </button>
//       </div>

//       {/* Floating "Add to Cart" button if a region is selected */}
//       {selectedRegion && (
//         <div className="absolute bottom-4 right-4 bg-white p-3 rounded shadow z-[1000]">
//           <p className="mb-2 font-medium">{selectedRegion.name} selected</p>
//           <button
//             onClick={handleAddToCart}
//             className="px-3 py-1 bg-purple-600 text-white rounded"
//           >
//             Add to Cart
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }













// import { useEffect, useRef } from "react";
// import { MapContainer, TileLayer, ScaleControl, useMap } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import "leaflet-editable"; // must be imported to patch Leaflet

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

// type Props = {
//   basemap: BasemapKey;
//   onMapReady?: (map: L.Map) => void;
// };

// /**
//  * Handles "editable:created" event from Leaflet.Editable
//  */
// function EditableHandler() {
//   const dispatch = useAppDispatch();
//   const cartCount = useAppSelector((s) => s.cart.regions.length);
//   const map = useMap();

//   useEffect(() => {
//     if (!map) return;

//     const handleCreated = (e: any) => {
//       try {
//         const layer = e.layer as L.Layer & {
//           toGeoJSON?: () => GeoJSON.Feature;
//         };
//         if (!layer.toGeoJSON) return;

//         const gj = layer.toGeoJSON();
//         const id = crypto.randomUUID();

//         const region: Region = {
//           id,
//           name: `Region ${new Date().toLocaleTimeString()}`,
//           geojson: gj,
//         };
//         dispatch(addRegion(region));
//         toast.success(`${region.name} added. Cart: ${cartCount + 1}`, {
//           duration: 2500,
//         });
//       } catch (err) {
//         console.error("Error handling created region:", err);
//       }
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
//         <EditableHandler />
//       </MapContainer>

//       {/* Floating buttons for drawing */}
//       <div className="absolute top-2 right-4 bg-white p-2 rounded shadow space-x-2 z-[1000]">
//         <button
//           onClick={() =>
//             mapRef.current && (mapRef.current as any).editTools.startPolygon()
//           }
//           className="px-2 py-1 bg-blue-500 text-white rounded"
//         >
//           Polygon
//         </button>
//         <button
//           onClick={() =>
//             mapRef.current && (mapRef.current as any).editTools.startRectangle()
//           }
//           className="px-2 py-1 bg-green-500 text-white rounded"
//         >
//           Rectangle
//         </button>
//       </div>
//     </div>
//   );
// }
