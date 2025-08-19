// cartSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Region } from "../../types";
import { computeCenter } from "../../utils/geo";

interface CartState {
  regions: Region[];
  selectedRegion: Region | null; // ✅ fixed type
}

const initialState: CartState = {
  regions: [],
  selectedRegion: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addRegion: (state, action: PayloadAction<Region>) => {
      const exists = state.regions.some((r) => r.id === action.payload.id);
      if (!exists) state.regions.unshift(action.payload);
    },
    removeRegion: (state, action: PayloadAction<string>) => {
      state.regions = state.regions.filter((r) => r.id !== action.payload);
    },
    clearCart: (state) => {
      state.regions = [];
    },
    updateRegion: (state, action: PayloadAction<Region>) => {
      const idx = state.regions.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) {
        state.regions[idx] = action.payload;
      }
    },
    setSelectedRegion: (state, action: PayloadAction<Region | null>) => {
      if (action.payload === null) {
        state.selectedRegion = null;
        return;
      }
      const { id, name, geojson } = action.payload;
      state.selectedRegion = {
        id,
        name,
        geojson,
        center: computeCenter(geojson), // ✅ auto
      };
    },
  },
});

export const {
  addRegion,
  removeRegion,
  clearCart,
  updateRegion,
  setSelectedRegion,
} = cartSlice.actions;
export default cartSlice.reducer;
