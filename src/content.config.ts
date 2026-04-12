import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Writing portfolio — fiction, essays, WIP novels
const writing = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
	schema: z.object({
		title: z.string(),
		genre: z.string(),
		status: z.enum(['draft', 'querying', 'published']),
		synopsis: z.string(),
		excerpt: z.string().optional(),
		coverImage: z.string().optional(),
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
	schema: z.object({
		title: z.string(),
		category: z.enum(['tech', 'home', 'garden']),
		status: z.enum(['active', 'complete', 'archived', 'wip']),
		description: z.string(),
		githubUrl: z.string().url().optional(),
		image: z.string().optional(),
		date: z.coerce.date(),
		featured: z.boolean().default(false),
		tags: z.array(z.string()).default([]),
	}),
});

// Recipes — cooking, baking, preservation
const recipes = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/recipes' }),
	schema: z.object({
		title: z.string(),
		category: z.enum(['baking', 'cooking', 'preservation']),
		description: z.string(),
		tags: z.array(z.string()).default([]),
		prepTime: z.string().optional(),
		cookTime: z.string().optional(),
		servings: z.number().optional(),
		image: z.string().optional(),
		date: z.coerce.date(),
		featured: z.boolean().default(false),
	}),
});

// Blog / long-form posts
const posts = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		description: z.string(),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
		featured: z.boolean().default(false),
	}),
});

export const collections = { writing, projects, recipes, posts };
