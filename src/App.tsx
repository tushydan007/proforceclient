import { useRef, useState } from "react";
import { Provider } from "react-redux";
import MapView from "./components/MapView";
import Cart from "./components/Cart";
import { Toaster } from "react-hot-toast";
import L from "leaflet";
import type { BasemapKey } from "./types";
import { store } from "./redux/store";

export default function App() {
  const [basemap, setBasemap] = useState<BasemapKey>("esriImagery");
  const mapRef = useRef<L.Map | null>(null);

  const locateMe = () => {
    const map = mapRef.current;
    if (!map) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 14);
        // marker
        const marker = window.L.marker([latitude, longitude]).bindPopup(
          "You are here"
        );
        marker.addTo(map).openPopup();
      },
      () => {
        // graceful fail
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Provider store={store}>
      <div className="grid grid-cols-[1fr_360px] grid-rows-[64px_1fr] h-screen">
        {/* Header */}
        <header className="col-span-2 h-16 border-b bg-white flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400" />
            <div className="font-semibold">Satellite Data Client</div>
          </div>

          <div className="flex items-center gap-3">
            {/* Basemap dropdown (OSM + ESRI layers) */}
            <label className="text-sm text-gray-600">Basemap</label>
            <select
              value={basemap}
              aria-label="Select base map"
              onChange={(e) => setBasemap(e.target.value as BasemapKey)}
              className="border rounded-md px-2 py-1 text-sm"
            >
              <option value="osm">OpenStreetMap</option>
              <option value="esriImagery">Esri World Imagery</option>
              <option value="esriStreets">Esri World Streets</option>
              <option value="esriTopo">Esri Topographic</option>
            </select>

            {/* My Location button (in header) */}
            <button
              onClick={locateMe}
              className="ml-2 bg-blue-600 text-white text-sm rounded-md px-3 py-1.5 hover:bg-blue-700"
            >
              📍 My Location
            </button>
          </div>
        </header>

        {/* Map */}
        <div className="overflow-hidden">
          <MapView
            basemap={basemap}
            onMapReady={async (m) => {
              mapRef.current = m;
              if (!window.L) {
                const leaflet = (await import("leaflet")).default;
                window.L = leaflet;
              }
              // window.L =
              //   ((m as any) && (window as any).L) ||
              //   (await import("leaflet")).default;
            }}
          />
        </div>

        {/* Cart */}
        <Cart />
      </div>

      <Toaster position="top-right" />
    </Provider>
  );
}
