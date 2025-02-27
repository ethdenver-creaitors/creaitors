import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Account } from "@aleph-sdk/account";
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from "@aleph-sdk/client";
import { alephApiServer } from "@/utils/constants";

interface AlephState {
  alephAccount?: Account;
  alephClient: AuthenticatedAlephHttpClient | AlephHttpClient;
}

const initialState: AlephState = {
  alephAccount: undefined,
  alephClient: new AlephHttpClient(),
};

const alephSlice = createSlice({
  name: "aleph",
  initialState,
  reducers: {
    connect(state, action: PayloadAction<Account>) {
      state.alephAccount = action.payload;
      state.alephClient = new AuthenticatedAlephHttpClient(
        action.payload,
        alephApiServer
      );
    },
    disconnect(state) {
      state.alephAccount = undefined;
      state.alephClient = new AlephHttpClient();
    },
  },
});

export const { connect, disconnect } = alephSlice.actions;

export default alephSlice.reducer;
