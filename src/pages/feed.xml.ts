import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export const prerender = true;

export async function GET(context: APIContext) {
	const site = context.site ?? new URL('https://sybilsedge.com');

	const [posts, recipes, projects, novels, shortStories] = await Promise.all([
		getCollection('posts', ({ data }) => !data.draft),
		getCollection('recipes'),
		getCollection('projects'),
		getCollection('novels'),
		getCollection('shortStories'),
	]);

	const items = [
		...posts.map((post) => ({
			title: post.data.title,
			pubDate: post.data.date,
			description: post.data.description,
			link: `/blog/${post.id}/`,
		})),
		...recipes.map((recipe) => ({
			title: recipe.data.title,
			pubDate: recipe.data.date,
			description: recipe.data.description,
			link: `/kitchen/${recipe.id}/`,
		})),
		...projects.map((project) => ({
			title: project.data.title,
			pubDate: project.data.date,
			description: project.data.description,
			link: `/projects/${project.id}/`,
		})),
		...novels.map((novel) => ({
			title: `Fiction: ${novel.data.title}`,
			// Fallback date as fiction collections currently lack date metadata
			pubDate: new Date('2024-01-01'),
			description: novel.data.synopsis,
			link: `/writing/novels/${novel.id}/`,
		})),
		...shortStories.map((story) => ({
			title: `Fiction: ${story.data.title}`,
			// Fallback date as fiction collections currently lack date metadata
			pubDate: new Date('2024-01-01'),
			description: story.data.synopsis,
			link: `/writing/stories/${story.id}/`,
		})),
	];

	items.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

	return rss({
		title: 'Sybilsedge RSS Feed',
		description: 'Transmissions from Sybilsedge — cloud architecture, stories, recipes, and maker projects.',
		site: site.toString(),
		items,
	});
}
