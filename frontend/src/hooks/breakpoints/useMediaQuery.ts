import { useEffect, useState } from "react";

/**
 * Custom hook that tells you whether a given media query is active.
 *
 * Inspired by https://usehooks.com/useMedia/
 * https://gist.github.com/gragland/ed8cac563f5df71d78f4a1fefa8c5633
 */
export default function useMediaQuery(query: string) {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		if (!window) return;

		const mediaQuery = window.matchMedia(query);
		setMatches(mediaQuery.matches);

		const handler = (event: { matches: boolean | ((prevState: boolean) => boolean) }) => setMatches(event.matches);
		mediaQuery.addEventListener("change", handler);

		return () => mediaQuery.removeEventListener("change", handler);
	}, [query]);
	return matches;
}
