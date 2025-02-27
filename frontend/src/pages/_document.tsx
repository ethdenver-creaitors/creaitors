import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
	return (
		<Html lang="en">
			<Head />
			<body className="antialiased">
				<div className="h-screen w-screen overflow-y-scroll">
					<Main />
					<NextScript />
				</div>
			</body>
		</Html>
	);
}
