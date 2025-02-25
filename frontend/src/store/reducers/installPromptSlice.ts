/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface InstallPromptState {
  showInstallAppButton: boolean;
  deferredPrompt?: any;
}

const initialState: InstallPromptState = {
  showInstallAppButton: false,
  deferredPrompt: null,
};

type PromptEvent = {
  prompt?: any;
};

const installPromptSlice = createSlice({
  name: "installPrompt",
  initialState,
  reducers: {
    setPrompt(state, action: PayloadAction<PromptEvent>) {
      const { prompt } = action.payload;

      state.deferredPrompt = prompt;
      state.showInstallAppButton = !!state.deferredPrompt;
    },
    removePrompt(state) {
      state.showInstallAppButton = initialState.showInstallAppButton;
      state.deferredPrompt = initialState.deferredPrompt;
    },
  },
});

export const { setPrompt, removePrompt } = installPromptSlice.actions;
export default installPromptSlice.reducer;
