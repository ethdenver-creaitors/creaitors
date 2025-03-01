import { configureStore } from "@reduxjs/toolkit";

import alephReducer from "./reducers/alephSlice";
import connectionReducer from "./reducers/connectionSlice";

export const store = configureStore({
	reducer: {
		aleph: alephReducer,
		connection: connectionReducer,
	},
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
