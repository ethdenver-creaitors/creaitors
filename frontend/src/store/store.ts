import { configureStore } from "@reduxjs/toolkit";

import alephReducer from "./reducers/alephSlice";

export const store = configureStore({
	reducer: {
		aleph: alephReducer,
	},
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
