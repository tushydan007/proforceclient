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
  },
});

export const { addRegion, removeRegion, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
