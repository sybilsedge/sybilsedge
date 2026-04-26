import { defineCollection, z } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { glob } from 'astro/loaders';

// ─── Writing Universe System ──────────────────────────────────────────────────
// Six inter-linked collections that power the multi-universe fiction system.
// Design principles (see #96):
//   - `universe` is required on every collection except `universes` itself
//   - Cross-collection relations use slug arrays resolved at build time
//   - `readingOrder` is a number (supports fractional insertion, e.g. 2.5)
//   - `lore.category` is an enum for consistent filtering

const universes = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/universes' }),
	schema: ({ image }) => z.object({
		name: z.string(),
		tagline: z.string(),
		description: z.string(),
		coverImage: z.object({
			src: image(),
			alt: z.string(),
		}).optional(),
		status: z.enum(['active', 'planned', 'archived']),
	}),
});

const characters = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/characters' }),
	schema: ({ image }) => z.object({
		name: z.string(),
		aliases: z.array(z.string()).optional(),
		universe: z.string(),
		role: z.string(),
		affiliation: z.array(z.string()).optional(),
		appearance: z.string().optional(),
		profileImage: z.object({
			src: image(),
			alt: z.string(),
		}).optional(),
		spoilerLevel: z.string().optional(),
		relatedCharacters: z.array(z.string()).default([]),
	}),
});

const novels = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/novels' }),
	schema: ({ image }) => z.object({
		title: z.string(),
		universe: z.string(),
		status: z.enum(['draft', 'in-progress', 'complete', 'published']),
		synopsis: z.string(),
		coverImage: z.object({
			src: image(),
			alt: z.string(),
		}).optional(),
		readingOrder: z.number().optional(),
		relatedCharacters: z.array(z.string()).default([]),
	}),
});

const shortStories = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/shortStories' }),
	schema: () => z.object({
		title: z.string(),
		universe: z.string(),
		synopsis: z.string(),
		wordcount: z.number().optional(),
		readingOrder: z.number().optional(),
		relatedCharacters: z.array(z.string()).default([]),
		relatedStories: z.array(z.string()).default([]),
		tags: z.array(z.string()).default([]),
	}),
});

const lore = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/lore' }),
	schema: ({ image }) => z.object({
		title: z.string(),
		universe: z.string(),
		category: z.enum(['location', 'faction', 'technology', 'history', 'culture', 'other']),
		relatedCharacters: z.array(z.string()).default([]),
		relatedStories: z.array(z.string()).default([]),
		coverImage: z.object({
			src: image(),
			alt: z.string(),
		}).optional(),
	}),
});

const timeline = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/timeline' }),
	schema: () => z.object({
		title: z.string(),
		universe: z.string(),
		era: z.string().optional(),
		inUniverseDate: z.string().optional(),
		summary: z.string(),
		relatedCharacters: z.array(z.string()).default([]),
		relatedStories: z.array(z.string()).default([]),
		relatedLore: z.array(z.string()).default([]),
	}),
});

// ─── Shared TypeScript types ──────────────────────────────────────────────────
export type Universe = CollectionEntry<'universes'>;
export type Character = CollectionEntry<'characters'>;
export type Novel = CollectionEntry<'novels'>;
export type ShortStory = CollectionEntry<'shortStories'>;
export type Lore = CollectionEntry<'lore'>;
export type Timeline = CollectionEntry<'timeline'>;

// Tech, home, and garden projects
const projects = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
	schema: ({ image }) => z.object({
		title: z.string(),
		category: z.enum(['tech', 'home', 'garden']),
		status: z.enum(['active', 'complete', 'archived', 'wip']),
		description: z.string(),
		githubUrl: z.string().url().optional(),
		image: z.object({
			src: image(),
			alt: z.string(),
		  }).optional(),
		images: z.array(z.object({
			src: image(),
			alt: z.string(),
			caption: z.string().optional(),
			metadata: z.record(z.string(), z.string()).optional(),
		})).optional(),
		steps: z.array(z.object({
			src: image(),
			alt: z.string(),
			label: z.string().optional(),
		})).optional(),
		date: z.coerce.date(),
		featured: z.boolean().default(false),
		tags: z.array(z.string()).default([]),
		// 0–100 completion percentage — renders a progress bar in the gallery card
		progress: z.number().min(0).max(100).optional(),
	}),
});

// Recipes — cooking, baking, preservation
const recipes = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/recipes' }),
	schema: ({ image }) => z.object({
		title: z.string(),
		category: z.enum(['baking', 'cooking', 'preservation']),
		description: z.string(),
		tags: z.array(z.string()).default([]),
		prepTime: z.string().optional(),
		cookTime: z.string().optional(),
		servings: z.number().optional(),
		// Structured data fields for JSON-LD (schema.org/Recipe)
		cuisine: z.string().optional(),
		ingredients: z.array(z.string()).optional(),
		instructions: z.array(z.string()).optional(),
		// Use Astro's image() helper so images are validated and optimised at
		// build time via getImage() — must be a local path relative to the entry.
		image: z.object({
			src: image(),
			alt: z.string(),
		}).optional(),
		images: z.array(z.object({
			src: image(),
			alt: z.string(),
			caption: z.string().optional(),
			metadata: z.record(z.string(), z.string()).optional(),
		})).optional(),
		steps: z.array(z.object({
			src: image(),
			alt: z.string(),
			label: z.string().optional(),
		})).optional(),
		date: z.coerce.date(),
		featured: z.boolean().default(false),
	}),
});

// Blog / long-form posts
const posts = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
	schema: ({ image }) => z.object({
		title: z.string(),
		date: z.coerce.date(),
		// Optional updated date — displayed in post header when present
		updatedDate: z.coerce.date().optional(),
		description: z.string(),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
		featured: z.boolean().default(false),
		// Slug references to entries in the `projects` collection.
		// Used to render a "Related projects" callout on the post detail page
		// and a "Related posts" section on the referenced project detail pages.
		relatedProjects: z.array(z.string()).optional(),
		// Use Astro's image() helper so hero images are validated and optimised
		// at build time — must be a local path relative to the entry.
		heroImage: z.object({
			src: image(),
			alt: z.string(),
		}).optional(),
	}),
});

// Backward-compatibility collection kept while remaining call sites still use
// getCollection('writing'). This should be removed once all consumers have
// been migrated to the newer fiction collections.
const writing = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
	schema: ({ image }) => z.object({
		title: z.string(),
		description: z.string().optional(),
		date: z.coerce.date().optional(),
		updatedDate: z.coerce.date().optional(),
		draft: z.boolean().default(false),
		featured: z.boolean().default(false),
		tags: z.array(z.string()).default([]),
		status: z.string().optional(),
		category: z.string().optional(),
		universe: z.string().optional(),
		coverImage: z.object({
			src: image(),
			alt: z.string(),
		}).optional(),
		heroImage: z.object({
			src: image(),
			alt: z.string(),
		}).optional(),
	}).passthrough(),
});

export const collections = { universes, characters, novels, shortStories, lore, timeline, projects, recipes, posts, writing };
