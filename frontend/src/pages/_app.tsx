import "@/styles/globals.css";
import "@coinbase/onchainkit/styles.css";

import AppHeader from "@/components/AppHeader";
import { store } from "@/store/store";
import type { AppProps } from "next/app";
import Head from "next/head";
import { Provider as ReduxProvider } from "react-redux";
import ChainProvider from "@/components/ChainProvider";
import WalletEventsListener from "@/components/WalletEventListener";
import AppFooter from "@/components/AppFooter";
import { Toaster } from "react-hot-toast";
import { oktoConfig } from "@/config/okto";
import { OktoProvider } from "@okto_web3/react-sdk";
import { GoogleOAuthProvider } from "@react-oauth/google";

export default function App({ Component, pageProps }: AppProps) {
	return (
		<>
			<Head>
				<title>CreAItors</title>
				<meta name="description" content="AI Agents Marketplace" />
				<link rel="icon" href="/favicon.ico" />
			</Head>

			<ReduxProvider store={store}>
				<GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
					<OktoProvider config={oktoConfig}>
						<ChainProvider>
							<WalletEventsListener />
							<div className="min-h-screen w-screen flex flex-col relative">
								{/* Header */}
								<AppHeader />
								{/* Background */}
								<div className="absolute top-0 -z-10 h-full w-full bg-background">
									<div className="absolute bottom-auto left-auto right-0 top-0 h-[500px] w-[500px] -translate-x-[30%] translate-y-[20%] rounded-full bg-primary opacity-30 blur-[80px]"></div>
									<div className="bottom-gradient"></div>
									<div className="pointed-grid" />
								</div>
								{/* Page Content */}
								<main className="min-h-screen pt-[var(--header-height)] md:pt-[var(--header-height-desktop)]">
									<Component {...pageProps} />
								</main>
								<Toaster position="bottom-center" reverseOrder={false} />
								{/* Footer */}
								<AppFooter />
							</div>
						</ChainProvider>
					</OktoProvider>
				</GoogleOAuthProvider>
			</ReduxProvider>
		</>
	);
}
