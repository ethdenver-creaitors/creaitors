import { useState, useEffect } from "react";

const imageCache = new Map<string, string>();

export default function useCachedImage(src?: string): string | undefined {
	const [cachedSrc, setCachedSrc] = useState<string>();

	useEffect(() => {
		if (!src) return;

		// If the image is already cached, use it
		if (imageCache.has(src)) return setCachedSrc(imageCache.get(src));

		// Otherwise, fetch the image and cache it
		fetch(src)
			.then((response) => response.blob())
			.then((blob) => {
				const objectUrl = URL.createObjectURL(blob);
				imageCache.set(src, objectUrl);
				setCachedSrc(objectUrl);
			})
			.catch((error) => console.error("Failed to cache image:", error));
	}, [src]);

	return cachedSrc;
}
