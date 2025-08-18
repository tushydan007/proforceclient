import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Region } from "../../types";

interface CartState {
  regions: Region[];
}

const initialState: CartState = { regions: [] };

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addRegion: (state, action: PayloadAction<Region>) => {
      // prevent duplicates by id
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
        state.regions[idx] = action.payload; // overwrite with new geojson
      }
    },
  },
});

export const { addRegion, removeRegion, clearCart, updateRegion } =
  cartSlice.actions;
export default cartSlice.reducer;
