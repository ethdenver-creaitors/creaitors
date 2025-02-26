import "@/styles/globals.css";
import "@coinbase/onchainkit/styles.css";

import AppHeader from "@/components/AppHeader";
import { store } from "@/store/store";
import type { AppProps } from "next/app";
import Head from "next/head";
import { Provider as ReduxProvider } from "react-redux";
import ChainProvider from "@/components/ChainProvider";
import WalletEventsListener from "@/components/WalletEventListener";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>CreAItors</title>
        <meta name="description" content="AI Agents Marketplace" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ReduxProvider store={store}>
        <ChainProvider>
          <WalletEventsListener />
          <div className="min-h-screen w-screen flex flex-col relative">
            <AppHeader />
            <main>
              <Component {...pageProps} />
            </main>
          </div>
        </ChainProvider>
      </ReduxProvider>
    </>
  );
}
