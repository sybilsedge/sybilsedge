import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Writing portfolio — fiction, essays, WIP novels
const writing = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
	schema: ({ image }) => z.object({
		title: z.string(),
		genre: z.string(),
		status: z.enum(['draft', 'querying', 'published']),
		synopsis: z.string(),
		excerpt: z.string().optional(),
		// Use Astro's image() helper so cover images are validated and optimised
		// at build time — must be a local path relative to the entry.
		coverImage: z.object({
			src: image(),
			alt: z.string(),
		}).optional(),
		date: z.coerce.date(),
		featured: z.boolean().default(false),
		// Progress tracking fields — update in frontmatter to reflect current state
		wordCount: z.number().optional(),
		chapterStatus: z.string().optional(),
	}),
});

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
		description: z.string(),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
		featured: z.boolean().default(false),
		// Use Astro's image() helper so hero images are validated and optimised
		// at build time — must be a local path relative to the entry.
		heroImage: z.object({
			src: image(),
			alt: z.string(),
		}).optional(),
	}),
});

export const collections = { writing, projects, recipes, posts };
