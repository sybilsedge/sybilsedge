/**
 * Shared gallery image processing utility.
 *
 * buildGalleryItems() converts a content entry's `images` array into plain,
 * serialisable BlueprintImage objects by running each image through Astro's
 * getImage() at build time.  The results are passed to the BlueprintGallery
 * React island which must only receive serialisable data (no Astro APIs).
 *
 * Used by:
 *   - src/pages/projects/[slug].astro
 *   - src/pages/kitchen/[slug].astro
 */
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import type { BlueprintImage } from '../components/BlueprintGallery.tsx';

interface ImageEntry {
	src: ImageMetadata;
	alt: string;
	caption?: string;
	metadata?: Record<string, string>;
}

/**
 * Optimises an array of content image entries into BlueprintImage objects
 * suitable for the BlueprintGallery island.  Returns an empty array when
 * `images` is undefined or empty.
 */
export async function buildGalleryItems(
	images: ImageEntry[] | undefined,
): Promise<BlueprintImage[]> {
	if (!images || images.length === 0) return [];

	return Promise.all(
		images.map(async (img) => {
			const [thumb, full] = await Promise.all([
				getImage({ src: img.src, width: 400, format: 'webp' }),
				getImage({ src: img.src, width: 1200, format: 'webp' }),
			]);
			return {
				src: full.src,
				thumbSrc: thumb.src,
				alt: img.alt,
				width: full.attributes.width ? Number(full.attributes.width) : undefined,
				height: full.attributes.height ? Number(full.attributes.height) : undefined,
				caption: img.caption,
				metadata: img.metadata,
			} satisfies BlueprintImage;
		}),
	);
}
