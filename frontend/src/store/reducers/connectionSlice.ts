import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ConnectionState {
	googleCredential?: string;
}

const initialState: ConnectionState = {
	googleCredential: undefined,
};

const connectionSlice = createSlice({
	name: "connection",
	initialState,
	reducers: {
		googleConnect(state, action: PayloadAction<string>) {
			state.googleCredential = action.payload;
			console.log("googleCredential", action.payload);
		},
		googleDisconnect(state) {
			state.googleCredential = undefined;
		},
	},
});

export const { googleConnect, googleDisconnect } = connectionSlice.actions;

export default connectionSlice.reducer;
